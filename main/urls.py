from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("about/", views.about, name="about"),
    path("contacts/", views.contacts, name="contacts"),
    path("privacy/", views.privacy, name="privacy"),
    path("consent/", views.consent, name="consent"),
    path("catalog/", views.catalog, name="catalog"),
    path("catalog/<slug:block_slug>/", views.catalog_block, name="catalog_block"),
    path(
        "catalog/<slug:block_slug>/<slug:direction_slug>/",
        views.catalog_direction,
        name="catalog_direction",
    ),
    path(
        "catalog/<slug:block_slug>/<slug:direction_slug>/<slug:system_slug>/",
        views.catalog_system,
        name="catalog_system",
    ),
    path(
        "catalog/<slug:block_slug>/<slug:direction_slug>/<slug:system_slug>/<slug:group_slug>/",
        views.product_group,
        name="product_group",
    ),
    path("vendors/", views.vendors, name="vendors"),
    path("partners/", views.partners, name="partners"),
    path("api/catalog-request/", views.catalog_request_api, name="api_catalog_request"),
    path("api/mini-request/", views.catalog_request_api, name="api_mini_request"),
    path("api/cookie-consent/", views.cookie_consent_api, name="api_cookie_consent"),
    path("assets/<path:path>", views.legacy_asset_redirect, name="legacy_asset_redirect"),
    path("<slug:page>/", views.legacy_page, name="legacy_page_slash"),
    path("<slug:page>", views.legacy_page, name="legacy_page"),
]
