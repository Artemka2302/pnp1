from io import StringIO
from django.core.management import call_command, CommandError
from django.test import TestCase
from main.models import CatalogBlock, Direction, CatalogSystem, ProductGroup, Vendor, Partner, VendorProductGroup


class SolutionVendorSyncTests(TestCase):
    def setUp(self):
        block = CatalogBlock.objects.create(slug='engineering-equipment', title='Инженерное оборудование')
        direction = Direction.objects.create(block=block, slug='vertical-transport', title='Вертикальный транспорт')
        system = CatalogSystem.objects.create(direction=direction, slug='lifty', title='Лифты')
        for slug in ('lifty', 'passenger-and-cargo-lifts', 'eskalatory-i-travolatory'):
            ProductGroup.objects.create(system=system, slug=slug, title=slug)
        Vendor.objects.create(slug='untouched', name='Existing company', notes='Preserve')

    def sync(self, apply=False, slugs=None):
        call_command('sync_solution_vendors', slugs=slugs or ['astro-lift', 'blt'], apply=apply, stdout=StringIO())

    def test_dry_run_and_unknown_brand_never_write(self):
        self.sync()
        self.assertEqual(Vendor.objects.count(), 1)
        with self.assertRaises(CommandError):
            self.sync(True, ['missing-brand'])
        self.assertEqual(Vendor.objects.count(), 1)

    def test_targeted_sync_is_idempotent_and_visible(self):
        self.sync(True)
        self.sync(True)
        self.assertEqual(Vendor.objects.count(), 3)
        self.assertEqual(VendorProductGroup.objects.count(), 6)
        self.assertEqual(Partner.objects.count(), 2)
        self.assertEqual(Vendor.objects.get(slug='untouched').notes, 'Preserve')
        for slug in ('astro-lift', 'blt'):
            self.assertContains(self.client.get('/vendors/', {'vendors': slug}), Vendor.objects.get(slug=slug).name)
            self.assertContains(self.client.get('/partners/', {'q': Vendor.objects.get(slug=slug).name}), Vendor.objects.get(slug=slug).logo)
            self.assertNotContains(self.client.get('/partners/', {'q': Vendor.objects.get(slug=slug).name}), 'Image6.png')

    def test_missing_catalog_group_fails_before_writes(self):
        ProductGroup.objects.filter(slug='lifty').delete()
        with self.assertRaises(CommandError):
            self.sync(True)
        self.assertEqual(Vendor.objects.count(), 1)
        self.assertFalse(Partner.objects.exists())
