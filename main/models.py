from django.db import models


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
