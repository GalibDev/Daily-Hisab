"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useFinance } from "@/components/state/finance-store";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

export function CategorySelect({ defaultValue }: Readonly<{ defaultValue?: string }>) {
  const { addCategory, categories } = useFinance();
  const { notify } = useToast();
  const [newCategory, setNewCategory] = useState("");

  function handleAddCategory() {
    const added = addCategory(newCategory);
    if (added) {
      notify("Category added successfully", "info");
      setNewCategory("");
      return;
    }
    notify("Category already exists or empty", "danger");
  }

  return (
    <div className="grid gap-2">
      <select name="category" className={inputClass} defaultValue={defaultValue ?? categories[0]}>
        {categories.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          className={inputClass}
          placeholder="New category"
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
        />
        <Button type="button" variant="outline" onClick={handleAddCategory} className="h-11 px-3">
          <Plus size={16} /> Add
        </Button>
      </div>
    </div>
  );
}
