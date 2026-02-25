# Campaign Update API

## Endpoint
`PUT /api/v1/campaigns/{campaign_id}`

## Authentication
- **JWT Authentication**: Required. Header: `Authorization: Bearer <token>`
- **Ownership Verification**: Only the campaign creator can update the campaign.

## Updatable Fields
| Field | Type | Constraints | Action |
|-------|------|-------------|--------|
| `target_amount` | string | Must be greater than current target. | Blockchain (+ DB) |
| `description` | string | None. | DB only |
| `end_date` | string | Must be later than current end date. | DB only |
| `tags` | string[] | Max 10 tags. | DB only |
| `social_links` | object | Keys: social platform, Values: valid URL. | DB only |
| `image_url` | string | Valid URL. | DB only |
| `title` | string | None. | DB only |

## Non-Updatable Fields
The following fields are ignored if included in the request body:
- `campaign_ref`
- `donation_token`
- `creator_address`
- `created_at`

## Business Rules
1. **Target Amount**: Can only be increased. Triggers `update_campaign_target` on the Cairo contract.
2. **End Date**: Can only be extended (later than current end date).
3. **Campaign State**: Campaigns that have ended cannot be updated (returns 409).
4. **Funding Threshold**: Campaigns with > 90% funding cannot be updated (returns 409).
5. **Rate Limiting**: Maximum 3 updates per campaign per day (UTC). Returns 403 if exceeded.
6. **Audit Trail**: Every successful update is logged in the `CampaignAudit` table.

## Error Codes
- `400 Bad Request`: Field validation failed (e.g. target decrease, invalid URL, tag limit).
- `401 Unauthorized`: Token missing or invalid.
- `403 Forbidden`: Not the owner or daily update limit reached.
- `404 Not Found`: Campaign not found.
- `409 Conflict`: Campaign ended or funding threshold exceeded.
- `422 Unprocessable Entity`: Validation errors.
- `500 Internal Server Error`: Database or Blockchain failure.
