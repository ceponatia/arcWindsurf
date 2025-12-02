# Update Character Schema to Support RAG

Read the following documents:

- [dev-docs/09-retrieval-and-scoring.md](../../dev-docs/09-retrieval-and-scoring.md) (retrieval and scoring design)
- [dev-docs/03-player-schema.md](../../dev-docs/03-player-schema.md)
- [dev-docs/06-items-inventory-and-outfits.md](../../dev-docs/06-items-inventory-and-outfits.md) (item/outfit design)

Then, prepare a minimal working test version of an updated character schema in the schemas package (`@minimal-rpg/schemas`) that supports the new character building guidelines. Do not implement runtime logic or RAG yet, focus on allowing the character schema to express the new design.

Update the character builder page to add new fields as for this test we will need explicit values and won't be able to rely on parsing.

What we want is to be able to add free text structured as hair color: brown, foot size: small and even though the schema may not explicitly have those values defined, it would still be able to ingest and store them in the db to be included in the prompt correctly.

Currently all data in the character schema will be included in the prompt as RAG is not yet supported.
