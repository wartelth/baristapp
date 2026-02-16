- Read other .md files for context. 

- Allow the database to have a persistent state for the user. This is an insanely hard task to standardize : you never know who will save what. 
We could solve this by doing No-Sql. An app stores its data in a file; in the database we store a document; then when the app is loaded we give her this document. 
Currently i have supabase for this, 


- 