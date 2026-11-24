"""Forecast daily average temperature from a single station's observations.

Requires pandas and numpy. To forecast the next seven calendar days:
    python forecast_avg_temp.py observations.csv
"""

from __future__ import annotations

import argparse

import numpy as np
import pandas as pd


def forecast_avg_temp(
    data: pd.DataFrame,
    *,
    date_col: str = "date",
    avg_col: str = "avg_temp",
    max_col: str = "max_temp",
    min_col: str = "min_temp",
    horizon: int = 7,
    alpha: float = 1.0,
    min_samples: int | None = None,
    samples_col: str = "samples",
    date_format: str | None = None,
) -> pd.DataFrame:
    """Fit a ridge regression for each lead using avg, max and min on day t.

    Pass one row per date for one station. Day +1 follows the latest day
    with all three temperatures. If min_samples is given, use only rows
    with at least that many measurements, for both training and forecasting.
    Forecasts are in the same units as the input temperatures.
    """
    if horizon < 1:
        raise ValueError("horizon must be at least 1")
    if not np.isfinite(alpha) or alpha <= 0:
        raise ValueError("alpha must be finite and greater than 0")

    temperature_cols = [avg_col, max_col, min_col]
    required = [date_col, *temperature_cols]
    if min_samples is not None:
        required.append(samples_col)
    if len(set(required)) != len(required):
        raise ValueError("Use a different column for each input")
    missing = [col for col in required if col not in data.columns]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    dates = pd.DatetimeIndex(pd.to_datetime(data[date_col], format=date_format))
    dates = dates.tz_localize(None).normalize()
    if dates.hasnans or dates.has_duplicates:
        raise ValueError("Use one row with a valid, unique date per station day")

    daily = data[temperature_cols].apply(pd.to_numeric).astype(float)
    daily = daily.replace([np.inf, -np.inf], np.nan)
    daily.index = dates
    if min_samples is not None:
        samples = pd.to_numeric(data[samples_col])
        eligible = samples.ge(min_samples).to_numpy(dtype=bool, na_value=False)
        daily = daily.loc[eligible]
    daily = daily.sort_index()

    features = daily.dropna()

    if features.empty:
        raise ValueError("No eligible day has all three temperatures")
    origin = features.index[-1]
    x_all = features.to_numpy()
    x_latest = x_all[-1]
    observed_avg = daily.loc[:origin, avg_col]

    forecasts = []
    for days_ahead in range(1, horizon + 1):
        offset = pd.Timedelta(days=days_ahead)
        # Match t to t + h by calendar date. Skip pairs with missing values.
        y_all = observed_avg.reindex(features.index + offset).to_numpy()
        paired = np.isfinite(y_all)
        x, y = x_all[paired], y_all[paired]
        if len(y) < 2:
            raise ValueError(f"Need at least two observed pairs for day +{days_ahead}")

        x_mean = x.mean(axis=0)
        x_scale = x.std(axis=0)
        x_scale[np.isclose(x_scale, 0)] = 1.0
        x_scaled = (x - x_mean) / x_scale
        y_mean = y.mean()
        penalty = alpha * np.eye(x_scaled.shape[1])
        coefficients = np.linalg.solve(
            x_scaled.T @ x_scaled + penalty,
            x_scaled.T @ (y - y_mean),
        )
        prediction = y_mean + ((x_latest - x_mean) / x_scale) @ coefficients
        forecasts.append((days_ahead, origin + offset, prediction))

    return pd.DataFrame(forecasts, columns=["day_ahead", "date", "avg_temp_forecast"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", help="Daily temperature CSV for one station")
    parser.add_argument("--date-col", default="date")
    parser.add_argument("--avg-col", default="avg_temp")
    parser.add_argument("--max-col", default="max_temp")
    parser.add_argument("--min-col", default="min_temp")
    parser.add_argument("--horizon", type=int, default=7, help="Calendar days to forecast")
    parser.add_argument("--min-samples", type=int, help="Minimum measurements per day")
    parser.add_argument("--samples-col", default="samples")
    parser.add_argument("--date-format", help="For example, %%d/%%m/%%Y")
    args = parser.parse_args()

    try:
        data = pd.read_csv(args.csv_path, encoding="utf-8-sig", dtype={args.date_col: str})
        forecast = forecast_avg_temp(
            data,
            date_col=args.date_col,
            avg_col=args.avg_col,
            max_col=args.max_col,
            min_col=args.min_col,
            horizon=args.horizon,
            min_samples=args.min_samples,
            samples_col=args.samples_col,
            date_format=args.date_format,
        )
    except (OSError, ValueError) as error:
        parser.exit(2, f"Error: {error}\n")

    print(forecast.to_string(index=False, formatters={"avg_temp_forecast": "{:.2f}".format}))


if __name__ == "__main__":
    main()
