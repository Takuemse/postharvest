import type { ReactNode } from "react";
import { STORAGE_LABEL } from "../lib/format";
import { labelCls } from "../lib/styles";
import type { Storage } from "../lib/types";

const STORAGES: Storage[] = ["AMBIENT", "COOL", "REFRIGERATED"];

type Props = { value: Storage; onChange: (s: Storage) => void; hint?: ReactNode };

export function StorageField({ value, onChange, hint }: Props) {
  return (
    <fieldset>
      <legend className={labelCls}>How is it stored?</legend>
      <div className="grid gap-2">
        {STORAGES.map((s) => (
          <label key={s} className="block cursor-pointer">
            <input type="radio" name="storage" className="peer sr-only" checked={value === s} onChange={() => onChange(s)} />
            <span className="block rounded-[10px] border border-line bg-white/60 px-4 py-3 peer-checked:border-field peer-checked:bg-field/5 peer-checked:font-medium peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ripe">
              {STORAGE_LABEL[s]}
            </span>
          </label>
        ))}
      </div>
      {hint}
    </fieldset>
  );
}