# Carbon Capital

Can four players change a city's mind? A four-player simulation of 125th Street in East Harlem.

**[Play it →](https://kelseydoubleu.github.io/CarbonCapital/)**

Each player is a real stakeholder with different power and incentives:

| Role | Wants | Can |
|---|---|---|
| Policymaker | Public approval | Rezone parcels, enact policies (Green Subsidy, Carbon Tax, Housing Quota, Deregulation), hold town halls |
| Developer | Profit | Acquire and develop parcels (2 actions per turn), request rezoning, raise capital |
| Architect | Recognition | Research bio-materials, retrofit, pitch bio-based designs, build the four Carbon Temples and the Material Hub |
| Citizen | Livability | Organize community spaces, spread the word, join coalitions, protest other players' moves |

Everyone shares two numbers: the **Carbon Index** (starts at 50,000 tons; at 100,000 the budget is gone and everyone loses) and the **Conviction Index** (how much the city cares about carbon; it fades every round).

- **Win together:** build the Material Hub and reach 80% conviction before the carbon budget runs out.
- **Win alone:** if 12 rounds pass without either, the highest personal score wins.

Any seat can be a human or the computer: play solo against three AIs, pass the screen between four people, or watch four computers play (`?demo`).

Part of *Carbon Temples* (ADV V "Scaling Up", Fall 2025, Columbia GSAPP; Kelsey Wang and Lorennah Granfors; instructor David Benjamin).

## Files

- `engine.js`: rules, city deck, AI players. No DOM, so it also runs in Node for balance simulations.
- `ui.js`, `style.css`, `index.html`: the interface.
- `assets/ground.png`: the 125th Street plan from the Figma board.
- `archive/`: earlier HTML versions and the Figma click-through prototype.

Vanilla HTML/CSS/JS, no build step.
