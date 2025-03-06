const ZANGO_CRUD_BASE = `
  The CRUD package simplifies the handling of data by offering robust capabilities for creating, reading, updating, and deleting entries, seamlessly integrating both table and form functionalities.
  With this package, developers can effortlessly manage data entities through intuitive interfaces while ensuring consistent and efficient data operations.
`;

export const ZANGO_CRUD_VIEW = `
${ZANGO_CRUD_BASE}

The CRUD package provides a class 'BaseCrudView' which can be inherited by views for managing the CRUD (Create, Read, Update, Delete) operations within the Zango application.

Customization Options:
  - Page Title Customization: The page_title attribute serves as the title displayed on the CRUD interface, representing the managed records. Customize it to reflect the nature of the data being managed.
  - Add Button Text: The add_btn_title attribute defines the text displayed on the "Add New" button within the interface. This feature enables users to seamlessly add new records to the system.
  - table: Name of the table which should be used in the crud view
  - form: Name of the form which should be used in the crud view
  - model: Name of the model which should be used in the crud view
  - checking add permission: The following method can be used to check if the user has access to add a new record
    def display_add_button_check(self, request):
      # Logic
      return <bool>
  - checking upload permission: The following method can be used to check if the user has access to upload records
    def has_upload_perm(self, request):
      # Logic
      return <bool>
  - editing records: The following method can be used to check if the user has access to edit records
    def can_perform_action_edit(self, request):
      # Logic
      return <bool>
  - downloading records: The following method can be used to check if the user has access to download records
    def has_download_perm(self, request):
      # Logic
      return <bool>

Example CRUD View:
from zango.core.utils import get_current_role

from ..packages.crud.base import BaseCrudView

from .forms import DeveloperForm
from .models import Developer
from .tables import DeveloperCrudTable
from .workflow import DeveloperWorkflow


class DeveloperCrudView(BaseCrudView):
    page_title = "Team"
    add_btn_title = "Add New"
    table = DeveloperCrudTable
    form = DeveloperForm
    model = Developer

    workflow = DeveloperWorkflow


    def display_add_button_check(self, request):
        return get_current_role().name in ['Admin']

    def can_perform_action_edit(self, request, obj):
        return get_current_role().name in ['Admin']

    def display_download_button_check(self, request):
        return get_current_role().name in ['Admin']

    def has_upload_perm(self, request):
        return get_current_role().name in ['Admin']

Review Guidelines
- Warn users if uncoditional access is provided to add, edit, download or upload records
- Check if appropriate page title, add button titles are used
- Ensure that the view inherits BaseCrudView and imports it using the statement 'from ..packages.crud.base import BaseCrudView'
- If any of the permission methods are using the role of the user to determine if permission must be granted they must use the get_current_role() and import it
  using 'from zango.core.utils import get_current_role'
- Enusure that if form, table, workflow or model are specified they are imported
`;

export const ZANGO_CRUD_TABLE = `
${ZANGO_CRUD_BASE}

The Crud package provides a class 'ModelTable' which can be used to declare and configure a zango table

Customization options:
  - Fields from the zango model can be added as ModelCols, the value will be fetched from the model itself
  - The values displayed in ModelCol can be modified by defining a method with the following signature
    def <column>_getval(self, obj):
      # logic to modify the value
      return value
  - Custom columns can be defined as StringCols
  - Each StringCol must also have a method with the following signature defined
    def <column>_getval(self, obj):
      # logic to calulate the value
      return value
  - If searchable is set to True in a StringCol it must define a method with the following signature to enable searching
    def <column>_Q_obj(self, search_term):
      # Logic to create a Q object
      return <Q object>
  - StatusCol can be added to display the workflow status
  - TagsCol can be added to display the workflow tags
  - row_actions can be specified in the following manner
    row_actions = [
      {
        "name": <action_name>,
        "key": <key>,
        "description": <description>,
        "type": <form or simple>,
        "form": <form_name> (optional),
        "confirmation_message": <comfirmation_message> (optional)
      }
    ]
  - A class Meta should be added to the Table class with the following attributes
    - model: Zango model to be used in the crud table
    - fields: List of fields (this list must not include StringCols, TagsCol, StatusCol)

Example Crud table
from ..packages.crud.table.base import ModelTable
from ..packages.crud.table.column import ModelCol, StringCol, TagsCol, StatusCol

from .models import Developer
from .forms import DeveloperForm

class DeveloperCrudTable(ModelTable):
  employee_id = ModelCol(display_as="Employee Id", searchable=True, sortable=True)
  name = ModelCol(display_as="Name", searchable=True, sortable=True)
  email = ModelCol(display_as="Email", searchable=True, sortable=True)
  designation = ModelCol(display_as="Designation", searchable=True, sortable=True)
  # monthly_ctc = ModelCol(display_as="Monthly Ctc", searchable=True, sortable=True)
  status = StatusCol(display_as="Status")
  hours_logged = StringCol(display_as="Hours Logged (MTD)")
  nu_of_projects = StringCol(display_as="# of Projects Logged (All time)")

  table_actions = [
  ]

  row_actions = [
    {
        "name": "Edit",
        "key": "edit",
        "description": "Edit",
        "type": "form",
        "form": DeveloperForm,
    }
  ]

  class Meta:
      model = Developer
      fields = ['employee_id', 'name', 'email', 'designation']
      row_selector = {}

  def hours_logged_getval(self, obj):
      from datetime import datetime, timedelta
      from django.utils.timezone import now, get_current_timezone
      import calendar
      # Get the current month's start and end dates
      today = now().date()
      first_day_of_month = today.replace(day=1)
      last_day_of_month = first_day_of_month + timedelta(days=calendar.monthrange(today.year, today.month)[1] - 1)

      # Filter logs for this month
      logs = obj.worklogs_set.filter(date__range=(first_day_of_month, last_day_of_month))

      # Calculate total hours and minutes logged
      total_hours = 0
      total_minutes = 0
      for log in logs:
          total_hours += log.hours
          total_minutes += log.minutes

      # Convert total minutes to hours and add to total hours
      total_hours += total_minutes / 60

      # Return the total hours logged this month
      return f"{total_hours:.2f} hours"

  def nu_of_projects_getval(self, obj):
      nu_of_projects = obj.worklogs_set.all().values('project').distinct().count()
      return nu_of_projects

Review Guidelines
  - Ensure that all the customization options are being used correctly
  - If a StringCol is defined a method to get its value must be defined and if searchable is set to True in the StringCol the Q_obj method must be defined to get its value
  - Enusre that the list of fields match the fields defined in the table
  - Ensure that row actions are defined correctly
`;

export const ZANGO_CRUD_FORM = `
${ZANGO_CRUD_BASE}

Zango Form Package Documentation
The Zango Form package provides a class BaseForm which can be used to declare and configure forms for Zango models.

Customization Options:

  - ModelField: Used to represent fields from the Zango model
    - placeholder: Text to display as placeholder
    - required: Boolean indicating if the field is required
    - required_msg: Custom error message when the field is empty
  - CustomSchemaField: Used to create complex custom fields with JSON schema
    - schema: JSON schema definition for the field
    - ui_schema: UI configuration for rendering the field
  - A class Meta should be added to the Form class with the following attributes:
    - model: Zango model to be used in the form
    - title: Title to display for the form
    - order: List defining the order of fields in the form

  -The __init__ method can be overridden to:
    - Customize field properties dynamically
    - Set up enumeration values for dropdown fields
    - Initialize default values based on an existing instance


  The save method can be overridden to:

  - Handle many-to-many relationships
  - Create or delete related objects
  - Perform custom validation logic before saving


Example Zango Form:

from typing import Any
from ..packages.crud.forms import BaseForm
from ..packages.crud.form_fields import ModelField, CustomSchemaField
from .models import Project, ProjectMember
from ..users.models import User

class ProjectForm(BaseForm):
    name = ModelField(
        placeholder="Project Name", required=True, required_msg="Project name is required"
    )
    description = ModelField(
        placeholder="Description", required=False
    )
    budget = ModelField(
        placeholder="Budget", required=True, required_msg="Budget is required"
    )
    team_members = CustomSchemaField(
        schema={
            "title": "Team Members",
            "type": "array",
            "uniqueItems": True,
            "items": {"type": "string"},
        },
        ui_schema={
            "ui:widget": "SelectFieldWidget",
            "ui:options": {"multiple": "true"},
            "ui:placeholder": "Select team members",
            "ui:errorMessages": {"required": "This field is required."},
        },
    )
    client = ModelField(placeholder="Client", required=True)
    start_date = ModelField(placeholder="Start Date", required=True)
    end_date = ModelField(placeholder="End Date", required=False)

    class Meta:
        model = Project
        title = "Project Details"
        order = [
            "name",
            "description",
            "budget",
            "client",
            "team_members",
            "start_date",
            "end_date",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        instance = kwargs.get("instance")

        # Populate dropdown with all available users
        self.custom_schema_fields["team_members"].schema["items"]["enum"] = [
            str(obj.pk) for obj in User.objects.all()
        ]
        self.custom_schema_fields["team_members"].schema["items"]["enumNames"] = [
            f"{obj.first_name} {obj.last_name}" for obj in User.objects.all()
        ]

        # Set default selected values if editing an existing project
        if instance is not None:
            project_members = ProjectMember.objects.filter(project=instance)
            member_ids = [member.user.id for member in project_members]
            self.custom_schema_fields["team_members"].schema["default"] = [
                str(obj.pk) for obj in User.objects.filter(id__in=member_ids)
            ]

    def save(self, commit=True):
        member_ids = self.data.getlist("team_members")
        members = User.objects.filter(id__in=member_ids)

        # Save the main form instance
        instance = super().save(commit=True)

        # Handle the many-to-many relationship
        existing_members = ProjectMember.objects.filter(project=instance)

        # Remove members that are no longer selected
        for project_member in existing_members:
            if not project_member.user in members:
                project_member.delete()

        # Add new members that weren't previously associated
        for member in members:
            if not ProjectMember.objects.filter(project=instance, user=member).exists():
                project_member = ProjectMember(project=instance, user=member)
                project_member.save()

        return super().save(commit)

Review Guidelines:
  - Ensure that all required fields have both required=True and a meaningful required_msg
  - For CustomSchemaField, verify that both schema and ui_schema are properly defined
  - Ensure that the field order in Meta.order matches all fields defined in the form
  - When handling related objects in save(), make sure to handle both creation and deletion
  - Check that __init__ properly initializes dropdown options and default values for existing instances
  - Verify that the form handles validation and data cleaning appropriately
`;

export const ZANGO_CRUD_DETAIL = `
${ZANGO_CRUD_BASE}

Zango Detail Package Documentation
The Zango Detail package provides a class BaseDetail which can be used to declare and configure detail views.

Customization Options:

  - ModelCol: Used to represent fields from the Zango model in the detail view
    - display_as: Text to display as the field label
  - A class Meta should be added to the Detail class with the following attributes:
    - fields: List defining the fields to be displayed in the detail view

  - Several methods can be overridden to customize the detail view:
    - get_title: Customize the title of the detail view based on the object
    - is_activity_timeline_visible: Determine if the activity timeline should be visible to the user
    - <field_name>_getval: Customize the display value for specific fields, including generating links or formatting data


Example Zango Detail:

from zango.core.utils import get_current_role
from zango.apps.object_store.models import ObjectStore
from ...appointment.forms import AppointmentForm
from ...packages.crud.detail.base import BaseDetail
from ...packages.crud.table.column import ModelCol
from ...packages.appointments.models import AbstractAppointmentModel

class BasePatientProgramDetail(BaseDetail):
    id = ModelCol(display_as="ID")
    patient = ModelCol(display_as="Patient")
    doctor = ModelCol(display_as="Doctor")
    hospital = ModelCol(display_as="Clinic")
    contact_person = ModelCol(display_as="Contact Person")
    years_since_diagnosis = ModelCol(display_as="Years since Diagnosis")
    discontinuation_reason = ModelCol(display_as="Discontinuation Reason")
    discontinuation_date = ModelCol(display_as="Discontinuation Date")
    consent_date = ModelCol(display_as="Consent Date")
    consent_file = ModelCol(display_as="Consent File")

    class Meta:
        fields = [
            "id",
            "patient",
            "doctor",
            "hospital",
            "contact_person",
            "years_since_diagnosis",
            "discontinuation_reason",
            "discontinuation_date",
            "consent_date",
            "consent_file",
        ]

    def get_title(self, obj, object_data):
        """
        It returns a string that represents the title of the patient program detail view.
        """
        return f"Patient Program: {obj.patient.first_name} {obj.patient.last_name}"

    def is_activity_timeline_visible(self, obj):
        """
        Returns True if the activity timeline is to be shown to the current user.
        """
        return get_current_role().name == "PSP Executive"

    def id_getval(self, obj):
        """
        Returns the formatted ID for display.
        """
        return obj.id + 10000

    def patient_getval(self, obj):
        """
        Get the value of a patient and generate a link to the patient's detail view.

        Params:
            self: the instance of the class
            obj: the object containing patient information

        Returns:
            str: a string containing a link to the patient's detail view
        """
        pat_url = f"/patients/patient/?pk={obj.patient.id}&view=detail&action=render"
        styles = "color:var(--primary-color) !important;"
        return f'<a target="_blank" style="{styles}" href="{pat_url}">{obj.patient.__str__()}</a>'

    def doctor_getval(self, obj):
        """
        Get the value of a doctor and generate a link to the doctor's detail view.

        Params:
            self: the instance of the class
            obj: the object containing doctor information

        Returns:
            str: a string containing a link to the doctor's detail view
        """
        doc_url = f"/doctors/doctor/?pk={obj.doctor.id}&view=detail&action=render"
        styles = "color:var(--primary-color) !important;"
        return f'<a target="_blank" style="{styles}" href="{doc_url}">{obj.doctor.__str__()}</a>'

    def hospital_getval(self, obj):
        """
        Get the value of a hospital and generate a link to the hospital's detail view.

        Params:
            self: the instance of the class
            obj: the object containing hospital information

        Returns:
            str: a string containing a link to the hospital's detail view
        """
        hosp_url = (
            f"/hospitals/hospital/?pk={obj.hospital.id}&view=detail&action=render"
        )
        styles = "color:var(--primary-color) !important;"
        return f'<a target="_blank" style="{styles}" href="{hosp_url}">{obj.hospital.__str__()}</a>'

Review Guidelines:
  - Ensure that all required fields have both display_as set accordingly
  - Verify that the Meta.fields list includes all the fields to be displayed in the detail view
  - Ensure that the get_title method provides a meaningful title for the detail view
  - Check that is_activity_timeline_visible correctly determines visibility based on user roles
  - Verify that <field_name>_getval methods correctly format and display field values, including generating appropriate links
  - Ensure that the detail view handles data retrieval and display appropriately
`;
