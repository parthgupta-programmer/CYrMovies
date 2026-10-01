# Dataset placement

Download the MovieLens dataset you intend to use from GroupLens and place these files under `data/ml-32m/`:

- `movies.csv`
- `ratings.csv`
- `links.csv`
- `tags.csv`

The training pipeline only requires `movies.csv` and `ratings.csv` for the core collaborative-filtering model. `links.csv` and `tags.csv` are optional extensions.
