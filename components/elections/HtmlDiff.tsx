"use client";
import dynamic from "next/dynamic";
import { DiffMethod } from "react-diff-viewer-continued";

const DiffViewer = dynamic(
  () => import("react-diff-viewer-continued").then((m) => m.default),
  { ssr: false },
);

interface Props {
  previous: string;
  current: string;
}

export default function HtmlDiff({ previous, current }: Props) {
  const renderLine = (line: string) => (
    <span dangerouslySetInnerHTML={{ __html: line }} />
  );

  return (
    <DiffViewer
      oldValue={previous}
      newValue={current}
      splitView
      leftTitle="Previous Article"
      rightTitle="Proposed Article"
      compareMethod={DiffMethod.CHARS}
      renderContent={renderLine}
      styles={{
        variables: {
          light: {
            addedBackground: "#e6ffe6",
            removedBackground: "#ffecec",
          },
        },
      }}
    />
  );
}
