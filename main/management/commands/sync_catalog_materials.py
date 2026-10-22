"""Apply only the approved AR/KR placement revision; preserve existing IDs."""
import json
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from main.catalog import invalidate_catalog_cache
from main.catalog_materials import REVISION, MATERIAL_SLUGS
from main.models import CatalogSystem, Direction, ProductGroup, ProductType, ProductAttribute, VendorProductGroup


class Command(BaseCommand):
    help = 'Preview or apply the approved AR/KR material redistribution. No bulk import.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        master=json.loads((settings.BASE_DIR/'data_import/catalog_master.json').read_text('utf-8'))
        dirs={d['id']:d for b in master['global_blocks'] for d in b['directions']}
        systems={s['id']:(d['id'],i,s) for d in dirs.values() for i,s in enumerate(d['systems'],1)}
        expected={g['id']:(s['id'],i,g) for d in dirs.values() for s in d['systems'] for i,g in enumerate(s['product_groups'],1)}
        if set(ProductGroup.objects.filter(slug__in=MATERIAL_SLUGS).values_list('slug',flat=True)) != MATERIAL_SLUGS:
            raise CommandError('Missing original material groups; nothing changed.')
        for item in REVISION['moves']:
            group=ProductGroup.objects.select_related('system').get(slug=item['slug'])
            if group.system.slug not in (REVISION['old_system'],item['system']):
                raise CommandError(f"Unexpected placement for {group.slug}; nothing changed.")
        old=CatalogSystem.objects.filter(slug=REVISION['old_system']).first()
        if old and (old.product_groups.exclude(slug__in=MATERIAL_SLUGS).exists() or CatalogSystem.objects.filter(slug=REVISION['new_system']).exists()):
            raise CommandError('Conflicting systems or additional material groups; nothing changed.')
        for slug in ('architecture','constructive'):
            if not Direction.objects.filter(slug=slug).exists():raise CommandError(f'Missing direction: {slug}')
        for item in REVISION['clones']:
            target=ProductGroup.objects.select_related('system').filter(slug=item['slug']).first()
            if target and target.system.slug!=item['system']:raise CommandError(f"Conflicting clone: {target.slug}")
        self.stdout.write('14 existing groups; 2 additional applications; 1 formwork type. IDs and CRM metadata preserved.')
        if not options['apply']:
            self.stdout.write('Dry run. Back up the database, then use --apply.')
            return
        with transaction.atomic():
            if old:
                old.slug=REVISION['new_system'];old.title=next(
                    item['title'] for item in REVISION['new_systems']
                    if item['slug'] == REVISION['new_system']
                )
                old.save(update_fields=['slug','title','updated_at'])
            for item in REVISION['new_systems']:
                direction=Direction.objects.get(slug=item['direction'])
                system,created=CatalogSystem.objects.get_or_create(slug=item['slug'],defaults={
                    'direction':direction,'title':item['title'],
                    'image':old.image if old else 'assets/img/catalog/generated/direction-constructive.webp',
                })
                if not created and (system.direction_id != direction.id or system.title != item['title']):
                    system.direction=direction
                    system.title=item['title']
                    system.save(update_fields=['direction','title','updated_at'])
            for item in REVISION['moves']:
                group=ProductGroup.objects.get(slug=item['slug'])
                group.system=CatalogSystem.objects.get(slug=item['system'])
                group.sort_order=expected[group.slug][1]
                group.save(update_fields=['system','sort_order','updated_at'])
            for item in REVISION['clones']:
                source=ProductGroup.objects.get(slug=item['source'])
                fields=('title','image','crm_category','crm_comment_hint','ai_aliases','ai_must_ask')
                group,_=ProductGroup.objects.get_or_create(slug=item['slug'],defaults={
                    **{k:getattr(source,k) for k in fields},
                    'system':CatalogSystem.objects.get(slug=item['system']),
                    'sort_order':expected[item['slug']][1],
                })
                for model,relation in ((ProductType,'types'),(ProductAttribute,'attributes')):
                    for row in getattr(source,relation).all():
                        model.objects.get_or_create(product_group=group,title=row.title,defaults={'sort_order':row.sort_order})
                for link in source.vendorproductgroup_set.all():
                    fields=[f.name for f in VendorProductGroup._meta.fields if f.name not in ('id','created_at','updated_at','vendor','product_group')]
                    VendorProductGroup.objects.get_or_create(vendor=link.vendor,product_group=group,defaults={k:getattr(link,k) for k in fields})
            for slug in ('architecture','constructive'):
                for i,s in enumerate(dirs[slug]['systems'],1):
                    CatalogSystem.objects.filter(slug=s['id']).update(sort_order=i)
            group=ProductGroup.objects.get(slug='formwork')
            ProductType.objects.get_or_create(product_group=group,title=REVISION['formwork_type'],defaults={'sort_order':len(expected['formwork'][2]['product_types'])})
        invalidate_catalog_cache()
        self.stdout.write(self.style.SUCCESS('Approved AR/KR placements synced. Other catalog data unchanged.'))
