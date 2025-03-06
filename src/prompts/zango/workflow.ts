export const ZANGO_WORKFLOW = `
The Workflow package allows you to define workflows with various status transitions and conditions. It also supports defining tag transitions with enabled and disabled states.

Customization options:
  - status_transitions: A list of dictionaries that define the transitions between statuses. Each dictionary can include the following keys:
    - name: Unique name for the transition
    - display_name: Display name for the transition
    - description: Description for the transition
    - form: Form associated with the transition (optional)
    - from: Initial status for the transition
    - to: Target status for the transition
    - confirmation_message: Message to confirm the transition (optional)
  - tag_transitions: A list of dictionaries that define the transitions for tags. Each dictionary can include the following keys:
    - name: Unique name for the tag
    - enabled: Dictionary for the enabled state with the following key:
      - confirmation_message: Message to confirm enabling the tag (optional)
    - disabled: Dictionary for the disabled state with the following key:
      - confirmation_message: Message to confirm disabling the tag (optional)
  - Conditions and Done Methods:
    - For each status transition, you can define methods to check conditions and perform actions when the transition is completed.
    - The condition method should have the following signature:
      def <transition_name>_condition(self, request, object_instance, **kwargs):
        # Logic to check condition
        return <True or False>
    - The done method should have the following signature:
      def <transition_name>_done(self, request, object_instance, transaction_obj):
        # Logic to perform action after transition
        pass
  - A class Meta should be added to the Workflow class with the following attributes:
    - on_create_status: Initial status when the workflow is created
    - statuses: A dictionary of statuses with their corresponding attributes (color and label)
    - tags: A list of tuples representing tags and their labels

Example Workflow:
from zango.core.utils import get_current_role
from ..packages.workflow.base.engine import WorkflowBase
from .forms import SubscriptionActiveForm

class SubscriptionsWorkflow(WorkflowBase):
    status_transitions = [
        {
            "name": "open_to_active",
            "display_name": "Mark Active",
            "description": "Mark Active",
            "form": SubscriptionActiveForm,
            "from": "open",
            "to": "active",
        },
        {
            "name": "open_to_closed",
            "display_name": "Mark Closed",
            "description": "Mark Closed",
            "confirmation_message": "Are you sure you want to mark this subscription as Closed?",
            "from": "open",
            "to": "closed",
        },
        {
            "name": "active_to_inactive",
            "display_name": "Mark Inactive",
            "description": "Mark Inactive",
            "confirmation_message": "Are you sure you want to mark this subscription as Inactive?",
            "from": "active",
            "to": "inactive",
        },
        {
            "name": "active_to_closed",
            "display_name": "Mark Closed",
            "description": "Mark Closed",
            "confirmation_message": "Are you sure you want to mark this subscription as Closed?",
            "from": "active",
            "to": "closed",
        },
        {
            "name": "inactive_to_active",
            "display_name": "Mark Active",
            "description": "Mark Active",
            "confirmation_message": "Are you sure you want to mark this subscription as Active?",
            "from": "inactive",
            "to": "active",
        },
        {
            "name": "inactive_to_closed",
            "display_name": "Mark Closed",
            "description": "Mark Closed",
            "confirmation_message": "Are you sure you want to mark this subscription as Closed?",
            "from": "inactive",
            "to": "closed",
        },
    ]

    tag_transitions = [
        {
            "name": "new",
            "enabled": {
                "confirmation_message": "Are you sure you want to mark this contact as New?",
            },
            "disabled": {
                "confirmation_message": "Are you sure you want to demark this contact as New?",
            },
        },
        {
            "name": "active",
            "enabled": {
                "confirmation_message": "Are you sure you want to mark this contact as Active?",
            },
            "disabled": {
                "confirmation_message": "Are you sure you want to demark this contact as Active?",
            },
        },
        {
            "name": "customer",
            "enabled": {
                "confirmation_message": "Are you sure you want to mark this contact as Customer?",
            },
            "disabled": {
                "confirmation_message": "Are you sure you want to demark this contact as Customer?",
            },
        },
        {
            "name": "follow_up_needed",
            "enabled": {
                "confirmation_message": "Are you sure you want to mark this contact as Follow Up Needed?",
            },
            "disabled": {
                "confirmation_message": "Are you sure you want to demark this contact as Follow Up Needed?",
            },
        },
        {
            "name": "inactive",
            "enabled": {
                "confirmation_message": "Are you sure you want to mark this contact as Inactive?",
            },
            "disabled": {
                "confirmation_message": "Are you sure you want to demark this contact as Inactive?",
            },
        },
        {
            "name": "lost",
            "enabled": {
                "confirmation_message": "Are you sure you want to mark this contact as Lost?",
            },
            "disabled": {
                "confirmation_message": "Are you sure you want to demark this contact as Lost?",
            },
        },
        {
            "name": "do_not_contact",
            "enabled": {
                "confirmation_message": "Are you sure you want to mark this contact as Do Not Contact?",
            },
            "disabled": {
                "confirmation_message": "Are you sure you want to demark this contact as Do Not Contact?",
            },
        },
    ]

    def open_to_active_condition(self, request, object_instance, **kwargs):
        if get_current_role() is not None:
            has_perm = get_current_role().name in ["Program Manager", "Project Manager"]
            return (
                True if has_perm and kwargs.get("current_status") == "open" else False
            )
        else:
            return True

    def open_to_active_done(self, request, object_instance, transaction_obj):
        object_instance.sub_date_of_first_invoice = transaction_obj.data["form_data"][
            "sub_date_of_first_invoice"
        ]
        object_instance.save()
        pass

    def active_to_inactive_condition(self, request, object_instance, **kwargs):
        if get_current_role() is not None:
            has_perm = get_current_role().name in ["Program Manager", "Project Manager"]
            return (
                True if has_perm and kwargs.get("current_status") == "active" else False
            )
        else:
            return True

    def active_to_inactive_done(self, request, object_instance, transaction_obj):
        pass

    def open_to_closed_condition(self, request, object_instance, **kwargs):
        if get_current_role() is not None:
            has_perm = get_current_role().name in [
                "Project Manager",
                "Program Manager",
                "SystemUsers",
            ]
            return (
                True if has_perm and kwargs.get("current_status") == "open" else False
            )
        else:
            return True

    def open_to_closed_done(self, request, object_instance, transaction_obj):
        pass

    def active_to_closed_condition(self, request, object_instance, **kwargs):
        if get_current_role() is not None:
            has_perm = get_current_role().name in [
                "Project Manager",
                "Program Manager",
                "SystemUsers",
            ]
            return (
                True if has_perm and kwargs.get("current_status") == "active" else False
            )
        else:
            return True

    def active_to_closed_done(self, request, object_instance, transaction_obj):
        pass

    def inactive_to_active_condition(self, request, object_instance, **kwargs):
        if get_current_role() is not None:
            has_perm = get_current_role().name in ["Project Manager", "Program Manager"]
            return (
                True
                if has_perm and kwargs.get("current_status") == "inactive"
                else False
            )
        else:
            return True

    def inactive_to_active_done(self, request, object_instance, transaction_obj):
        pass

    def inactive_to_closed_condition(self, request, object_instance, **kwargs):
        if get_current_role() is not None:
            has_perm = get_current_role().name in [
                "Project Manager",
                "Program Manager",
                "SystemUsers",
            ]
            return (
                True
                if has_perm and kwargs.get("current_status") == "inactive"
                else False
            )
        else:
            return True

    def inactive_to_closed_done(self, request, object_instance, transaction_obj):
        pass

    class Meta:
        on_create_status = "open"
        statuses = {
            "open": {
                "color": "#FFD800",
                "label": "Open",
            },
            "active": {
                "color": "#229470",
                "label": "Active",
            },
            "inactive": {
                "color": "#AA2113",
                "label": "Inactive",
            },
            "closed": {
                "color": "#808080",
                "label": "Closed",
            },
        }
        tags = [
            ("new", "New"),
            ("active", "Active"),
            ("customer", "Customer"),
            ("follow_up_needed", "Follow Up Needed"),
            ("inactive", "Inactive"),
            ("lost", "Lost"),
            ("do_not_contact", "Do Not Contact"),
        ]

Review Guidelines:
  - Ensure that all the customization options are being used correctly.
  - Ensure that each status transition has a corresponding condition and done method.
  - Verify that the status transitions are defined with the correct keys and values.
  - Ensure that each tag transition has enabled and disabled states with confirmation messages.
  - Ensure that the Meta class includes the on_create_status, statuses, and tags attributes with the correct structure.
`;
