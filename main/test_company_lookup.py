import json
from unittest.mock import patch
from urllib.error import URLError

from django.core import signing
from django.core.cache import cache
from django.test import Client, SimpleTestCase, TestCase

from .bitrix import COOPERATION_COMMENT_FIELD, build_bitrix_payload
from .company_lookup import TOKEN_SALT, provider_suggestions, selected_company
from .models import Lead

RECORD = {"name": "ПАО СБЕРБАНК", "inn": "7707083893", "kpp": "773601001",
          "ogrn": "1027700132195", "address": "г Москва", "status": "ACTIVE"}


class CompanyLookupTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)

    def query(self, query):
        return self.client.post('/api/company-suggestions/', {"query": query}, content_type='application/json')

    @patch('main.company_lookup.lookup_configured', return_value=True)
    @patch('main.company_lookup.provider_suggestions', return_value=[RECORD])
    def test_lookup_caches_and_returns_signed_selection_not_credentials(self, provider, configured):
        result = self.query('7707083893')
        self.assertEqual(result.status_code, 200)
        selected = result.json()['suggestions'][0]
        self.assertEqual(selected_company(selected['token']), RECORD)
        self.assertNotIn('Authorization', result.content.decode())
        self.query('7707083893')
        provider.assert_called_once_with('7707083893')

    @patch('main.company_lookup.lookup_configured', return_value=False)
    def test_unconfigured_mode_is_explicit(self, configured):
        response = self.query('Сбербанк')
        self.assertEqual(response.status_code, 503)
        self.assertTrue(response.json()['manual'])

    @patch('main.company_lookup.lookup_configured', return_value=True)
    @patch('main.company_lookup.provider_suggestions', side_effect=URLError('private diagnostic'))
    def test_provider_failure_is_safe_and_does_not_enable_manual_bypass(self, provider, configured):
        response = self.query('Сбербанк')
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('manual', response.json())
        self.assertNotIn('private diagnostic', response.content.decode())

    @patch('main.company_lookup.lookup_configured', return_value=True)
    @patch('main.company_lookup.provider_suggestions', return_value=[])
    def test_rate_limit(self, provider, configured):
        for _ in range(30):
            self.assertEqual(self.query('Компания').status_code, 200)
        self.assertEqual(self.query('Компания').status_code, 429)

    def test_csrf_and_query_validation(self):
        self.assertEqual(Client(enforce_csrf_checks=True).post('/api/company-suggestions/', {}, content_type='application/json').status_code, 403)
        self.assertEqual(self.query('ab').status_code, 400)
        self.assertEqual(self.query('a' * 101).status_code, 400)

    def test_selection_signature_and_expiry(self):
        token = signing.dumps(RECORD, salt=TOKEN_SALT)
        self.assertIsNone(selected_company(token + 'bad'))
        with patch('django.core.signing.time.time', return_value=1):
            expired = signing.dumps(RECORD, salt=TOKEN_SALT)
        self.assertIsNone(selected_company(expired))

    @patch.dict('os.environ', {'DADATA_API_KEY': 'test-key'})
    @patch('main.company_lookup.urlopen')
    def test_provider_exact_inn_filter_and_minimal_data(self, opener):
        item = {'value': RECORD['name'], 'data': {'inn': RECORD['inn'], 'kpp': RECORD['kpp'],
                'ogrn': RECORD['ogrn'], 'address': {'value': RECORD['address']},
                'state': {'status': 'ACTIVE'}, 'management': {'name': 'not retained'}}}
        opener.return_value.__enter__.return_value.read.return_value = json.dumps({'suggestions': [item]}).encode()
        self.assertEqual(provider_suggestions(RECORD['inn']), [RECORD])
        self.assertEqual(provider_suggestions('0000000000'), [])


class CompanyLeadTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.delivery = patch('main.views.send_lead_to_bitrix', return_value={'configured': False, 'sent': False})
        self.delivery.start()
        self.addCleanup(self.delivery.stop)
        self.payload = {'proposer_type': 'supplier', 'company': RECORD['name'],
                        'contact_name': 'Тестовый контакт', 'phone': '+79000000000',
                        'email': 'test@example.com', 'message': 'Предложение', 'consent': '1'}

    @patch('main.views.lookup_configured', return_value=True)
    def test_verified_company_and_contact_reach_actual_crm_payload(self, configured):
        self.payload['company_token'] = signing.dumps(RECORD, salt=TOKEN_SALT)
        self.payload['company_record'] = {'inn': 'forged'}
        response = self.client.post('/api/cooperation-request/', self.payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        lead = Lead.objects.get()
        self.assertEqual(lead.contact_name, self.payload['contact_name'])
        self.assertEqual(lead.raw_payload['company_record'], RECORD)
        self.assertNotIn('company_token', lead.raw_payload)
        comment = build_bitrix_payload(lead)['fields'][COOPERATION_COMMENT_FIELD]
        self.assertIn('ИНН: ' + RECORD['inn'], comment)
        self.assertIn('Контактное лицо: Тестовый контакт', comment)

    @patch('main.views.lookup_configured', return_value=True)
    def test_missing_forged_and_stale_selection_rejected(self, configured):
        for token in ('', 'forged', signing.dumps({**RECORD, 'name': 'Другая компания'}, salt=TOKEN_SALT)):
            self.payload['company_token'] = token
            response = self.client.post('/api/cooperation-request/', self.payload)
            self.assertEqual(response.status_code, 400)
        self.assertFalse(Lead.objects.exists())

    @patch('main.views.lookup_configured', return_value=False)
    def test_unconfigured_form_does_not_claim_verified_details(self, configured):
        self.payload['company_record'] = RECORD
        self.payload['company_verified'] = True
        response = self.client.post('/api/cooperation-request/', self.payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        lead = Lead.objects.get()
        self.assertFalse(lead.raw_payload['company_verified'])
        self.assertNotIn('company_record', lead.raw_payload)
        self.payload['company'] = '1234567890'
        self.assertEqual(self.client.post('/api/cooperation-request/', self.payload, content_type='application/json').status_code, 400)
