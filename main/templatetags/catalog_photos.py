from django import template

from main.catalog_images import catalog_image_payload


register = template.Library()
register.simple_tag(catalog_image_payload, name="catalog_photo")
