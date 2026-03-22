// Reusable Double Slider Component


interface RangeSliderProps {
    min: number;
    max: number;
    minLimit: number;
    maxLimit: number;
    step: number;
    onChange: (min: number, max: number) => void;
}

export function RangeSlider ({ min, max, minLimit, maxLimit, step, onChange }: RangeSliderProps) {
    const left = `${((min - minLimit) / (maxLimit - minLimit)) * 100}%`;
    const right = `${100 - ((max - minLimit) / (maxLimit - minLimit)) * 100}%`;

    return (
        <div class={styles.wrap}>
            <div class={styles.track}></div>
            <div class={styles.range} style={{ left, right }}></div>
            <input
                type="range" min={minLimit} max={maxLimit} step={step} value={min}
                onChange={(e) => {
                    const target = e.target as HTMLInputElement;
                    const val = Number(target.value);
                    if (val <= max) onChange(val, max);
                }}
                class={styles.input}
            />
            <input
                type="range" min={minLimit} max={maxLimit} step={step} value={max}
                onChange={(e) => {
                    const target = e.target as HTMLInputElement;
                    const val = Number(target.value);
                    if (val >= min) onChange(min, val);
                }}
                class={styles.input}
            />
        </div>
    );
};

const styles = {
  wrap: "relative w-full h-6 flex items-center",
  track: "absolute w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700",
  range: "absolute h-1.5 rounded-full bg-blue-600",
  input: "range-slider-input",
};
