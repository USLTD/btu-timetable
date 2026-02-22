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
        <div className="relative w-full h-6 flex items-center">
            <div className="absolute w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="absolute h-1.5 bg-blue-600 rounded-full" style={{ left, right }}></div>
            <input
                type="range" min={minLimit} max={maxLimit} step={step} value={min}
                onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= max) onChange(val, max);
                }}
                className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full cursor-pointer"
            />
            <input
                type="range" min={minLimit} max={maxLimit} step={step} value={max}
                onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= min) onChange(min, val);
                }}
                className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full cursor-pointer"
            />
        </div>
    );
};