export const ZANGO_POLICIES = `
  ## Structure of policies.json
  {
    "policies": [
      {
        "name": "string",
        "description": "string",
        "statement": {
          "permissions": [
            {
              "name": "string",
              "type": "string"
            }
          ]
        }
      }
    ]
  }

  ## Review Steps
  1. **Policies Section**:
    - Verify that each policy has a valid name and description.
    - Ensure that each policy contains a statement with a permissions array.
  2. **Permissions Section**:
    - Verify that each permission within the permissions array has a valid name and type.
    - Ensure that the name follows the format module.views.ViewName.
    - Confirm that the type is a valid permission type (e.g., view, edit, delete).
  3. **General Validation**:
    - Check that there are no missing or extra fields in the configuration file.
    - Ensure that the overall structure of the JSON is valid and consistent.
`;
