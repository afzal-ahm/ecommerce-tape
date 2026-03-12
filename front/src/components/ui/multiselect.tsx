import * as React from "react";

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="w-full border rounded px-3 py-2 text-left bg-white"
        onClick={() => setOpen((o) => !o)}
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">
            {placeholder || "Select..."}
          </span>
        ) : (
          <span>
            {options
              .filter((o) => value.includes(o.value))
              .map((o) => o.label)
              .join(", ")}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center px-3 py-2 cursor-pointer hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                className="mr-2"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
