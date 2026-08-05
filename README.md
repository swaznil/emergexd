# emergexd

Simple particle simulators where repulsion and attraction occurs between particles in real time, creating complex emergent patterns and behaviors from simple rules.


### Live Demo

Project can be run by cloning the repository and opening index.html or directly through the link:

```
https://emergexd.vercel.app/
```

or

```
https://swaznil.github.io/emergexd/
```

---
## For Life01 (First attempt)

First Porject in EmergexD series

#### Features

- Real time particle simulation
- Pan camera controls + Zoom
- Built-in presets
- Mutiple custom particle groups supported
- Customizable interaction matrix
- Reset, Pause and Step controls
- Adjustable attraction/repulsion
- Spatial grid optimization for better performance
- Completely 2D
- GPU rendering using PixiJS

## For Life02 (Second Attempt) 

### Improvements and new features:

- Seeded simulations, so the same seed gives the same result
- More distinct presets with their own spawn patterns
- Reroll and custom seed controls
- Adjustable interaction radius and simulation speed
- Fixed timestep movement for more stable simulation
- Faster interaction lookup using group IDs and an interaction matrix
- Cleaner camera movement using PixiJS stage transforms
- Better reset behavior that rebuilds the active preset
- Improved particle spawning with custom position and velocity functions
- More polished controls, stats and preset states


#### Screenshots

![Particle simulation first attempt - Life01 ](assets/life01.png)

![Improved simulation second attempt - Life02 ](assets/life02.png)

---

#### Controls

| Control | Action |
|---|---|
| Right click + drag | Move Camera |
| Mouse wheel | Zoom |
| Positive values | Attraction |
| Negative values | Repulsion |

### Tech Stack

- HTML 5 with canvas
- CSS
- JavaScript
- PixiJS rendering library

### How It Works

The simulation is based on simple interaction rules between particle groups. Interaction forces are applied to particle, causing particles to moveand form emergent patterns over time.

Each particle belongs to a group with unique attraction or repulsion values toward other groups. Every nearby particles are checked using spatial grid optimization for better performance.

The simulation is rendered using PixiJS GPU-accelerated rendering.


### Project Structure

```text
emergexd/
│
├── index.html
├── main.js
├── style.css
├── README.md
│
├── assets/
│   └── Screenshot01.png
├─── life02/
│   ├── life02.html
│   ├── canvas.js
│   ├── preset.js
│   └── style02.css
│
└── life01/
    ├── life01.html
    ├── canvas.js
    ├── preset.js
    └── style01.css
```

---

### Motivation

I came across a youtube video about The Three body problem and wanted to simulated to simulate something 
similar, but with many bodies (in this case, particles). 
While developing a gravity simualtor I was not satisfied with using only attractice force and I experimented with negative gravity (in this case repulsion) and added different partices with different properties. 
Doing so and further researching this topic, I cam across the niche some particlelife simualtor websites 
and I was inspired by it. 
I wanted something similar and here I am creating it as the first project in my EmergexD series, made for Horizons Hackclub.

### AI Usage

ChatGPT was used for:
- Debugging JS code with general guidacnce
- Discussing simulation logics
- Performance Improvements and code cleanup 

All project decesions, implementaion choices and over third quarter of coding was done by me.

---

More experiments will be added over time.
Made for Horizons, Hackclub.
