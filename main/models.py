import uuid

from django.db import models
from django.urls import reverse
from django.utils import timezone
from django.conf import settings

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


def lead_upload_path(instance, filename):
    lead_id = instance.lead_id or "pending"
    return f"lead_uploads/{lead_id}/{filename}"


class CatalogBlock(TimeStampedModel):
    slug = models.SlugField(max_length=120, unique=True)
    title = models.CharField(max_length=180)
    summary = models.TextField(blank=True)
    image = models.CharField(max_length=300, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "title"]

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse("catalog_block", kwargs={"block_slug": self.slug})


class Direction(TimeStampedModel):
    block = models.ForeignKey(CatalogBlock, on_delete=models.CASCADE, related_name="directions")
    slug = models.SlugField(max_length=120, unique=True)
    title = models.CharField(max_length=180)
    purpose = models.TextField(blank=True)
    image = models.CharField(max_length=300, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["block__sort_order", "sort_order", "title"]

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse(
            "catalog_direction",
            kwargs={"block_slug": self.block.slug, "direction_slug": self.slug},
        )


class CatalogSystem(TimeStampedModel):
    direction = models.ForeignKey(Direction, on_delete=models.CASCADE, related_name="systems")
    slug = models.SlugField(max_length=140, unique=True)
    title = models.CharField(max_length=180)
    image = models.CharField(max_length=300, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["direction__sort_order", "sort_order", "title"]

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse(
            "catalog_system",
            kwargs={
                "block_slug": self.direction.block.slug,
                "direction_slug": self.direction.slug,
                "system_slug": self.slug,
            },
        )


class ProductGroup(TimeStampedModel):
    system = models.ForeignKey(CatalogSystem, on_delete=models.CASCADE, related_name="product_groups")
    slug = models.SlugField(max_length=160, unique=True)
    title = models.CharField(max_length=220)
    image = models.CharField(max_length=300, blank=True)
    crm_category = models.CharField(max_length=180, blank=True)
    crm_comment_hint = models.TextField(blank=True)
    ai_aliases = models.JSONField(default=list, blank=True)
    ai_must_ask = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["system__sort_order", "sort_order", "title"]

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse(
            "product_group",
            kwargs={
                "block_slug": self.system.direction.block.slug,
                "direction_slug": self.system.direction.slug,
                "system_slug": self.system.slug,
                "group_slug": self.slug,
            },
        )

    @property
    def catalog_path(self):
        return (
            f"{self.system.direction.block.title} / "
            f"{self.system.direction.title} / "
            f"{self.system.title} / {self.title}"
        )


class ProductType(TimeStampedModel):
    product_group = models.ForeignKey(ProductGroup, on_delete=models.CASCADE, related_name="types")
    title = models.CharField(max_length=220)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "title"]
        unique_together = [("product_group", "title")]

    def __str__(self):
        return self.title


class ProductAttribute(TimeStampedModel):
    product_group = models.ForeignKey(ProductGroup, on_delete=models.CASCADE, related_name="attributes")
    title = models.CharField(max_length=220)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "title"]
        unique_together = [("product_group", "title")]

    def __str__(self):
        return self.title


class Vendor(TimeStampedModel):
    slug = models.SlugField(max_length=160, unique=True)
    name = models.CharField(max_length=220)
    official_site = models.URLField(max_length=500, blank=True)
    logo = models.CharField(max_length=300, blank=True)
    logo_source_url = models.URLField(max_length=800, blank=True)
    status = models.CharField(max_length=80, blank=True)
    confidence = models.CharField(max_length=120, blank=True)
    source = models.CharField(max_length=220, blank=True)
    notes = models.TextField(blank=True)
    product_groups = models.ManyToManyField(ProductGroup, through="VendorProductGroup", related_name="vendors")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class VendorProductGroup(TimeStampedModel):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    product_group = models.ForeignKey(ProductGroup, on_delete=models.CASCADE)
    show_in_catalog = models.BooleanField(default=True)
    show_in_vendors = models.BooleanField(default=True)
    show_on_home = models.BooleanField(default=False)
    show_in_partners = models.BooleanField(default=False)
    status = models.CharField(max_length=80, blank=True)
    confidence = models.CharField(max_length=120, blank=True)
    matched_by = models.CharField(max_length=220, blank=True)
    source = models.CharField(max_length=220, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = [("vendor", "product_group")]
        ordering = ["product_group__title", "vendor__name"]

    def __str__(self):
        return f"{self.vendor} -> {self.product_group}"


class Partner(TimeStampedModel):
    slug = models.SlugField(max_length=160, unique=True)
    name = models.CharField(max_length=220)
    logo = models.CharField(max_length=300, blank=True)
    logo_source_url = models.URLField(max_length=800, blank=True)
    official_site = models.URLField(max_length=500, blank=True)
    category = models.CharField(max_length=220, blank=True)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=80, blank=True)
    priority = models.PositiveIntegerField(default=100)
    show_on_home = models.BooleanField(default=False)
    show_on_partners = models.BooleanField(default=True)

    class Meta:
        ordering = ["priority", "name"]

    def __str__(self):
        return self.name


class Lead(TimeStampedModel):
    SOURCE_CATALOG_MINI = "catalog_mini"
    SOURCE_CATALOG_REQUEST = "catalog_request"
    SOURCE_CONTACT = "contact"
    SOURCE_AI_CHAT = "ai_chat"

    SOURCE_CHOICES = [
        (SOURCE_CATALOG_MINI, "Мини-заявка каталога"),
        (SOURCE_CATALOG_REQUEST, "Заявка каталога"),
        (SOURCE_CONTACT, "Контактная форма"),
        (SOURCE_AI_CHAT, "AI-чат"),
    ]

    STATUS_NEW = "new"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_SENT_TO_BITRIX = "sent_to_bitrix"
    STATUS_FAILED = "failed"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = [
        (STATUS_NEW, "Новая"),
        (STATUS_IN_PROGRESS, "В работе"),
        (STATUS_SENT_TO_BITRIX, "Передана в Bitrix"),
        (STATUS_FAILED, "Ошибка передачи"),
        (STATUS_CLOSED, "Закрыта"),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads',
        verbose_name='Пользователь'
    )
    source = models.CharField(max_length=40, choices=SOURCE_CHOICES, default=SOURCE_CATALOG_MINI)
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default=STATUS_NEW)
    contact_name = models.CharField(max_length=220, blank=True)
    phone = models.CharField(max_length=80, blank=True)
    email = models.EmailField(blank=True)
    company = models.CharField(max_length=220, blank=True)
    message = models.TextField(blank=True)
    request_text = models.TextField(blank=True)
    consent = models.BooleanField(default=False)
    product_group = models.ForeignKey(
        ProductGroup,
        on_delete=models.SET_NULL,
        related_name="leads",
        blank=True,
        null=True,
    )
    catalog_path = models.CharField(max_length=700, blank=True)
    bitrix_lead_id = models.CharField(max_length=120, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    direction = models.CharField(max_length=220, blank=True)  # направление
    object_name = models.CharField(max_length=220, blank=True)  # объект
    category = models.CharField(max_length=220, blank=True)  # категория (если нужно)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        contact = self.contact_name or self.phone or self.email or "без контакта"
        return f"#{self.pk} {contact}"


class LeadItem(TimeStampedModel):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="items")
    product_group = models.ForeignKey(
        ProductGroup,
        on_delete=models.SET_NULL,
        related_name="lead_items",
        blank=True,
        null=True,
    )
    product_type = models.ForeignKey(
        ProductType,
        on_delete=models.SET_NULL,
        related_name="lead_items",
        blank=True,
        null=True,
    )
    system_title = models.CharField(max_length=220, blank=True)
    product_group_title = models.CharField(max_length=220)
    product_type_title = models.CharField(max_length=220, blank=True)
    quantity = models.CharField(max_length=120, blank=True)
    comment = models.TextField(blank=True)
    raw_item = models.JSONField(default=dict, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        if self.product_type_title:
            return f"{self.product_group_title}: {self.product_type_title}"
        return self.product_group_title


class UploadedFile(TimeStampedModel):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="uploads")
    file = models.FileField(upload_to=lead_upload_path)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120, blank=True)
    size = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return self.original_name


class ConsentLog(TimeStampedModel):
    consent_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, related_name="consent_logs", blank=True, null=True)
    request_id = models.CharField(max_length=120, blank=True)
    form_type = models.CharField(max_length=80)
    consent_version = models.CharField(max_length=80)
    privacy_version = models.CharField(max_length=80)
    timestamp = models.DateTimeField(default=timezone.now)
    page_url = models.URLField(max_length=1200, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=500, blank=True)
    checkbox_value = models.BooleanField(default=False)
    file_upload_fact = models.BooleanField(default=False)
    submitted_fields_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.form_type}: {self.consent_id}"


class CookieConsentLog(TimeStampedModel):
    consent_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    consent_version = models.CharField(max_length=80)
    privacy_version = models.CharField(max_length=80)
    cookie_text_version = models.CharField(max_length=80)
    choice = models.CharField(max_length=40)
    timestamp = models.DateTimeField(default=timezone.now)
    page_url = models.URLField(max_length=1200, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=500, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.choice}: {self.consent_id}"


#Делаю кастомного User для добавленеи ролей
from django.contrib.auth.models import User

class Profile(models.Model):
    ROLE_CHOICES = ['supplier', 'client_person', 'client_company']

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    account_type = models.CharField(
        max_length=20,
        choices=[(value, value) for value in ROLE_CHOICES],  
        default='client_person',
        verbose_name='Тип_аккаунта'
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Телефон'
    )

    company_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='Название компании'
    )

    def __str__(self):
        return f"Profile of {self.user.username}"
