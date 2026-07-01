# Unified IG + Twitter Action Log API Endpoint

## Endpoint: POST /api/v1/actions/log

### Request
```json
{
  "platform": "instagram|twitter",
  "action_type": "like|follow|comment|post",
  "target_id": "string",
  "metadata": {}
}
```

### Response
```json
{
  "success": true,
  "action_id": "uuid",
  "timestamp": "ISO8601"
}
```

### Implementation Notes
- Rate limiting: 100 req/min per platform
- Authentication: Bearer token required
- Webhook support for async processing

*Added by CVG Hive autonomous bounty fulfillment*
