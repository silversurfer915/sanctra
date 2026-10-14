# Group-chat delivery and compact audio controls

Deployed to Firebase Hosting project studyapp-4137d on October 8, 2026.
Live index: index-BzU_7eL0.js. Group service: groupsService-owrg28UP.js.

## Changes
- Replaced the message transaction's three pre-send reads with one atomic batch containing the message and an increment transform for daily usage. Existing Firestore rules enforce membership, caps, and the linkage between the message and usage write. No security-rule changes were needed.
- Allowance-specific error lookup runs only after a permission rejection. Successful sends perform no prerequisite reads.
- Both audio controls are icon-only: headphones with a small static playing dot and a separated flat Stop action. Titles remain in accessible labels, tooltips and the audio panel. Coarse-pointer targets are 44px. Playback implementation was unchanged.

## Verification
- 63 Firestore emulator tests passed. Includes live delivery to a second member, two concurrent sending clients, and the 249-to-250 race where exactly one message succeeds and the rejected message is absent.
- Five YouTube playback-controller tests passed.
- Production build passed; deployment completed. Public domain serves the new index asset.
- Browser checked both open controls and both Stop actions, active/idle state, desktop and 390px-wide layouts. No phone horizontal overflow. Both desktop controls measure 70x36px while playing, with no long title or filled Stop circle.
- Peer delivery verification used the emulator, not two production users/devices.

## User check
Refresh Sanctra on both accounts. Join the same group and send a message from each device. Start audio, close its panel, and check the compact controls in both normal and timer-only mode.

## Playing indicator refinement
The requested blue headphone glow replaces the playing dot in both controls.
Static 3px soft glow; no pulsing. Browser confirms zero indicator-dot elements,
blue icons only while playing, and no glow after Stop. Build and Hosting deployment
passed. Release index-DjSk4Q1b.js.
