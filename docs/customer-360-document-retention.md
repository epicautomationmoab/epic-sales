# Customer 360 Document Retention

## Product decisions

- Preserve signed Epic agreements and waivers indefinitely.
- Preserve MPWR waivers indefinitely.
- Customer 360 is the permanent access point for historical reservation documents.
- Historical waivers should not clutter the main Customer 360 lifecycle timeline.
- Expose historical signed documents from the related reservation/document detail instead.
- Cancellation Policy Acknowledgement remains a first-class Customer 360 timeline event because sending, opening, and accepting it are meaningful customer interactions.
- Customer 360 should remain the durable customer-history surface even when the operational workflow that originally collected the document is long over.

## Design principle

Customer 360 is the long-term system of record for customer history and retrieval. The main timeline should emphasize meaningful events, while detailed legal and operational documents remain accessible from their related reservation context.
