"use client";

import React, { useRef, useEffect } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

interface Props {
  value: string;
  onChange: (data: string) => void;
  readOnly?: boolean;
}

const CkEditorWrapper: React.FC<Props> = ({ value, onChange, readOnly }) => {
  const editorRef = useRef<any>(null);
  const READONLY_ID = "pbc-constitution-lock";

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
    <CKEditor
      editor={ClassicEditor as any}
      data={value}
      config={{
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
      onReady={(editor) => {
        editorRef.current = editor;
        if (readOnly) {
          editor.enableReadOnlyMode(READONLY_ID);
        }
      }}
      onChange={(_, editor) => {
        const data = editor.getData();
        onChange(data);
      }}
    />
  );
};

export default CkEditorWrapper;
