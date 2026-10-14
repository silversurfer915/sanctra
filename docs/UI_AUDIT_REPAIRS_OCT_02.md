# UI audit repairs — 2 October

Source: Sanctra - UI audit.pdf (18 pages). Document content was treated as reported findings, not operational instructions.

| Finding | Repair |
| --- | --- |
| 1. Faint step numbers | Visible themed step badges. |
| 2. Low contrast text | Brighter secondary text and denser frosted surfaces. |
| 3. Right strip and short dividers | Theme boot colour, full-width surfaces and isolated wallpaper stacking. |
| 4. Tiny labels | Shared minimum label sizing and type scale. |
| 5. Modal typography | Shared Playfair headings and themed surfaces. |
| 6. Raw markdown previews | Preview text strips markdown, inline headings and formatting. |
| 7. Legacy Settings and null identity | Shared settings styling; guest identity copy corrected. |
| 8. Settings height jumps | Stable responsive modal height and themed tabs. |
| 9. Amber accents | Planner and settings use the active theme accent. |
| 10. Page width drift | Shared content widths and spacing. |
| 11. Sidebar jitter | Stable navigation row sizing. |
| 12. Metric alignment | Consistent label and value slots. |
| 13. Casing and wrapping | Sentence-case timer actions and responsive controls. |
| 14. Native date/select styling | Themed date calendar and analytics select controls; other native controls remain themed. |
| 15. Button inconsistency | Shared sizing and 44px interaction targets. |
| 16. Empty modes card | Explicit empty state. |
| 17. Tablet gaps and ring size | Responsive timer sizing and compact short-screen spacing. |
| 18. What's new empty hero | Popup omits decorative cover; regular images reserve their aspect ratio. |
| 19. Grey startup flash | Saved or time-based theme ink applied before React. |
| 20. Cramped phone layout | Two-column metrics, wrapped notice and timer-first layout. |
| 21. Date label alignment | Aligned label and themed calendar button. |
| 22. Inbox metric alignment | Consistent summary slots and shorter labels. |

Also fixed a null-announcement render guard, once-read announcement synchronization, the stylesheet cascade overriding mobile repairs, and new work spaces inheriting school subjects on refresh.

Validation: 72 tests passed and production build succeeded. Local phone (390x844) and tablet (820x1180) timer layouts were visually inspected. A real iOS device was not available; Safari-specific behavior needs device confirmation.
