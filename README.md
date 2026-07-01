# Motion Lab

An interactive one-dimensional kinematics app that keeps a motion diagram and position–time, velocity–time, and acceleration–time graphs in sync.

## Run it

Open `index.html` in a modern browser. No installation or build step is required.

For a local web server, run:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Current model

The first version models motion with constant acceleration:

- `p(t) = p₀ + v₀t + ½at²`
- `v(t) = v₀ + at`
- `a(t) = a`
