# Glass and ranking polish

The appearance slider now supplies the shared blur token to the document, including sibling dialogs and body overlays. Fixed backdrop values and nested card overrides now follow that token. Browser checks verified 0px and 24px endpoints on metrics, nested cards, inputs/search and settings overlays; Tasks summary/calendar inherit it too.

Global ranking highlights now use compact equal-height cards in rank order, including two-member communities. Plus cover artwork is contained and faded behind identity headers, with avatar effects retained. The member list includes the leaders, and the personal summary has less redundant copy.

Validation: isolated production build passed; 127 tracked tests passed. Browser checks at 1440x1000 and 834x1112 confirmed no horizontal overflow, member search, period selection, 2 leaders/3 rows and 3 leaders/8 rows. Physical iPad Safari was not available. Concurrent AI edits were excluded from the release.
