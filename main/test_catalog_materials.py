from io import StringIO
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from .catalog_materials import REVISION, MATERIAL_SLUGS
from .models import CatalogSystem, ProductGroup, ProductType, VendorProductGroup


class CatalogMaterialRevisionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('import_pnp_data',stdout=StringIO())

    def setUp(self):
        cache.clear()

    def test_material_placements_and_independent_ar_kr(self):
        for item in REVISION['moves']+REVISION['clones']:
            self.assertEqual(ProductGroup.objects.get(slug=item['slug']).system.slug,item['system'])
        self.assertFalse(CatalogSystem.objects.filter(slug=REVISION['old_system']).exists())
        root=self.client.get('/api/catalog-node/',{'id':'root'}).json()
        self.assertEqual([r['projectSection']['group'] for r in root['children'][:2]],['architecture','constructive'])
        self.assertEqual(len(root['children']),14)
        self.assertTrue(ProductType.objects.filter(product_group__slug='formwork',title=REVISION['formwork_type']).exists())

    def test_all_old_material_links_redirect_and_new_pages_work(self):
        old='/catalog/building-materials/constructive/wood-based-panel-materials/'
        self.assertRedirects(self.client.get(old),CatalogSystem.objects.get(slug='wooden-structures').get_absolute_url(),status_code=301)
        for slug in MATERIAL_SLUGS:
            group=ProductGroup.objects.select_related('system__direction__block').get(slug=slug)
            self.assertRedirects(self.client.get(old+slug+'/'),group.get_absolute_url(),status_code=301)
        alias=self.client.get('/api/catalog-node/',{'id':'system:wood-based-panel-materials'}).json()
        self.assertEqual(alias['node']['id'],'system:wooden-structures')
        self.assertRedirects(self.client.get('/solution-constructive-mdf'),ProductGroup.objects.get(slug='mdf').get_absolute_url())

    def restore_old_placements(self):
        ProductGroup.objects.filter(slug__in=[row['slug'] for row in REVISION['clones']]).delete()
        ProductType.objects.filter(product_group__slug='formwork',title=REVISION['formwork_type']).delete()
        system=CatalogSystem.objects.get(slug='wooden-structures')
        system.slug=REVISION['old_system'];system.save()
        ProductGroup.objects.filter(slug__in=MATERIAL_SLUGS).update(system=system)

    def test_dry_run_and_repeat_apply_preserve_original_records(self):
        self.restore_old_placements()
        groups=list(ProductGroup.objects.filter(slug__in=MATERIAL_SLUGS).order_by('id').values_list('id','slug','crm_category','crm_comment_hint'))
        type_ids=list(ProductType.objects.filter(product_group__slug__in=MATERIAL_SLUGS).order_by('id').values_list('id',flat=True))
        links=list(VendorProductGroup.objects.filter(product_group__slug__in=MATERIAL_SLUGS).order_by('id').values_list('id','vendor_id','product_group_id','show_in_catalog'))
        call_command('sync_catalog_materials',stdout=StringIO())
        self.assertEqual(ProductGroup.objects.filter(system__slug=REVISION['old_system']).count(),14)
        call_command('sync_catalog_materials',apply=True,stdout=StringIO())
        for row in REVISION['clones']:
            source=ProductGroup.objects.get(slug=row['source'])
            clone=ProductGroup.objects.get(slug=row['slug'])
            self.assertEqual(list(source.types.values_list('title',flat=True)),list(clone.types.values_list('title',flat=True)))
            self.assertEqual(set(source.vendors.values_list('pk',flat=True)),set(clone.vendors.values_list('pk',flat=True)))
        counts=(ProductGroup.objects.count(),ProductType.objects.count(),VendorProductGroup.objects.count())
        system=CatalogSystem.objects.get(slug=REVISION['new_system'])
        system.title='Legacy title';system.save(update_fields=['title'])
        call_command('sync_catalog_materials',apply=True,stdout=StringIO())
        expected_title=next(item['title'] for item in REVISION['new_systems'] if item['slug']==REVISION['new_system'])
        self.assertEqual(CatalogSystem.objects.get(slug=REVISION['new_system']).title,expected_title)
        self.assertEqual(counts,(ProductGroup.objects.count(),ProductType.objects.count(),VendorProductGroup.objects.count()))
        self.assertEqual(groups,list(ProductGroup.objects.filter(slug__in=MATERIAL_SLUGS).order_by('id').values_list('id','slug','crm_category','crm_comment_hint')))
        self.assertEqual(type_ids,list(ProductType.objects.filter(product_group__slug__in=MATERIAL_SLUGS).order_by('id').values_list('id',flat=True)))
        self.assertEqual(links,list(VendorProductGroup.objects.filter(product_group__slug__in=MATERIAL_SLUGS).order_by('id').values_list('id','vendor_id','product_group_id','show_in_catalog')))

    def test_unexpected_placement_stops_without_writes(self):
        self.restore_old_placements()
        ProductGroup.objects.filter(slug='mdf').update(system=CatalogSystem.objects.get(slug='ceilings'))
        with self.assertRaises(CommandError):call_command('sync_catalog_materials',apply=True,stdout=StringIO())
        self.assertTrue(CatalogSystem.objects.filter(slug=REVISION['old_system']).exists())
