export const ZANGO_MODEL = `
Zango allows you to define dynamic models. These models must use DynamicModelBase as their base class.

Customization options:
  - Fields: Define fields similar to django models.
    - ZForeignKey: Custom foreign key field from Zango.
    - ZOneToOneField: Custom one-to-one field from Zango.
    - Note: ManyToManyField is not supported.

Example Dynamic Model:
from django.db import models
from zango.apps.dynamic_models.models import DynamicModelBase
from zango.apps.dynamic_models.fields import ZForeignKey, ZOneToOneField
from ..accounts.models import Account

class Contact(DynamicModelBase):
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    designation = models.CharField(max_length=255)
    email = models.EmailField(unique=True, blank=True, null=True)
    phone = models.CharField(max_length=255, blank=True, null=True)
    account = ZForeignKey(Account, on_delete=models.CASCADE)
    linkedIn_profile = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.first_name

Review Guidelines:
  - Ensure that DynamicModelBase is used as the base class for the model.
  - Ensure that all fields are using Zango's custom field types where applicable.
  - Verify that ZForeignKey and ZOneToOneField are used instead of ForeignKey and OneToOneField.
  - Ensure that ManyToManyField is not used, as it is not supported.
  - Verify that custom methods are defined correctly within the model class.
`;
