from django.test import SimpleTestCase, override_settings
from django.urls import reverse


@override_settings(ALLOWED_HOSTS=["testserver"])
class GoogleSiteVerificationTests(SimpleTestCase):
    def test_verification_file_is_public_and_has_only_google_token(self):
        url = reverse("google_site_verification")
        self.assertEqual(url, "/googlec1ddf76696582111.html")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.strip(),
            b"google-site-verification: googlec1ddf76696582111.html",
        )
        self.assertTrue(response["Content-Type"].startswith("text/html"))

    def test_verification_file_supports_head(self):
        response = self.client.head(reverse("google_site_verification"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"")
