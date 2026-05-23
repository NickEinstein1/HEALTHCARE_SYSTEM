type Props = {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
};

export function CrudRowActions({ onEdit, onDelete, editLabel = "Edit", deleteLabel = "Delete" }: Props) {
  return (
    <div className="crud-row-actions">
      {onEdit ? (
        <button className="btn-s btn-sm" type="button" onClick={onEdit}>
          {editLabel}
        </button>
      ) : null}
      {onDelete ? (
        <button className="btn-s btn-sm btn-danger" type="button" onClick={onDelete}>
          {deleteLabel}
        </button>
      ) : null}
    </div>
  );
}
