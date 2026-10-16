"""Targeted source sync. Never run a full catalog import for new brands."""
import csv
import json
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from main.catalog import invalidate_catalog_cache
from main.models import Partner, ProductGroup, Vendor, VendorProductGroup
from .import_pnp_data import bool_value


class Command(BaseCommand):
    help = 'Sync named solution vendors, catalog links and partner cards; dry-run by default.'

    def add_arguments(self, parser):
        parser.add_argument('--slugs', nargs='+', required=True)
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        requested = set(options['slugs'])
        source = settings.BASE_DIR / 'data_import'
        with (source / 'vendors_master.csv').open(encoding='utf-8-sig', newline='') as stream:
            vendors = {r['slug']: r for r in csv.DictReader(stream) if r['slug'] in requested}
        with (source / 'catalog_vendor_map.csv').open(encoding='utf-8-sig', newline='') as stream:
            links = [r for r in csv.DictReader(stream) if r['vendor_slug'] in requested]
        partners = {r['slug']: r for r in json.loads((source / 'partners.json').read_text(encoding='utf-8')) if r['slug'] in requested}
        if set(vendors) != requested or set(partners) != requested or {r['vendor_slug'] for r in links} != requested:
            raise CommandError('Each brand needs a vendor, partner and catalog mapping in sources')
        groups = {g.slug: g for g in ProductGroup.objects.filter(slug__in=[r['product_group_id'] for r in links])}
        if any(r['product_group_id'] not in groups for r in links):
            raise CommandError('Catalog groups missing; nothing changed')
        for row in vendors.values():
            if not row['logo'] or not (settings.BASE_DIR / 'static' / row['logo']).is_file():
                raise CommandError('A local approved logo is required')
        self.stdout.write(f"Selected: {', '.join(sorted(requested))}; catalog links: {len(links)}")
        if not options['apply']:
            self.stdout.write('Dry run. Pass --apply to update only these records.')
            return
        with transaction.atomic():
            for slug, row in vendors.items():
                Vendor.objects.update_or_create(slug=slug, defaults={
                    'name': row['vendor_name'], **{k: row[k] for k in ('official_site', 'logo', 'logo_source_url', 'status', 'confidence', 'source', 'notes')},
                })
                partner = partners[slug]
                Partner.objects.update_or_create(slug=slug, defaults={k: partner[k] for k in (
                    'name', 'logo', 'logo_source_url', 'official_site', 'category', 'note', 'status', 'priority', 'show_on_home', 'show_on_partners')})
            for row in links:
                VendorProductGroup.objects.update_or_create(vendor=Vendor.objects.get(slug=row['vendor_slug']),
                    product_group=groups[row['product_group_id']], defaults={
                        **{k: bool_value(row[k]) for k in ('show_in_catalog', 'show_in_vendors', 'show_on_home', 'show_in_partners')},
                        **{k: row[k] for k in ('status', 'confidence', 'matched_by', 'source', 'notes')},
                    })
            transaction.on_commit(invalidate_catalog_cache)
        self.stdout.write(self.style.SUCCESS('Selected brands synced. Other records preserved.'))
