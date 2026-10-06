import type { Location } from "../hooks/useLocations";
import { field } from "../lib/styles";

const pretty = (p: string) =>
  p.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

type Props = { id: string; value: string; onChange: (v: string) => void; locations: Location[] };

export function LocationSelect({ id, value, onChange, locations }: Props) {
  const groups = locations.reduce<Record<string, Location[]>>((acc, l) => {
    (acc[l.province] ||= []).push(l);
    return acc;
  }, {});

  return (
    <select id={id} className={field} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="" disabled>Choose your town or district</option>
      {Object.entries(groups).map(([province, items]) => (
        <optgroup key={province} label={pretty(province)}>
          {items.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}