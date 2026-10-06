"use client";

import { deleteClass } from "@/app/admin/classes/actions";

export default function DeleteClassButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteClass}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${name}"? Its upcoming dates are removed too. This can't be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn btn-danger btn-sm">Delete</button>
    </form>
  );
}
