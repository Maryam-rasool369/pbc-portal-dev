import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { useEffect, useState, useRef } from "react";
import { useThemeMode } from "flowbite-react";

interface CKEditorClientProps {
  value: string;
  onChange: (data: string) => void;
  readOnly?: boolean;
}

export default function CKEditorClient({
  value,
  onChange,
  readOnly = false,
}: CKEditorClientProps) {
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const editorRef = useRef<any>(null);
  const { mode } = useThemeMode();
  const READONLY_ID = "pbc-editor-lock";

  useEffect(() => {
    setEditorLoaded(true);

    return () => {
      try {
        if (
          editorRef.current &&
          typeof editorRef.current.destroy === "function"
        ) {
          editorRef.current = null;
        }
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    setIsDarkMode(mode === "dark");
  }, [mode]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (readOnly) {
      editor.enableReadOnlyMode(READONLY_ID);
    } else {
      editor.disableReadOnlyMode(READONLY_ID);
    }
  }, [readOnly]);

  return (
    <div
      className={`ck-editor-container ${isDarkMode ? "ck-dark-mode" : ""} ${readOnly ? "ck-readonly" : ""}`}
    >
      {editorLoaded ? (
        <CKEditor
          editor={ClassicEditor}
          data={value}
          onReady={(editor) => {
            editorRef.current = editor;
            if (readOnly) {
              editor.enableReadOnlyMode(READONLY_ID);
            }
          }}
          onChange={(event, editor) => {
            if (!readOnly) {
              const data = editor.getData();
              onChange(data);
            }
          }}
          config={{
            content: {
              styles: isDarkMode
                ? "body { color: #f3f4f6; background: #1f2937; }"
                : undefined,
            },
            toolbar: [
              "heading",
              "|",
              "bold",
              "italic",
              "underline",
              "subscript",
              "superscript",
              "|",
              "bulletedList",
              "numberedList",
              "|",
              "undo",
              "redo",
            ],
          }}
        />
      ) : (
        <p>Loading editor...</p>
      )}
    </div>
  );
}
