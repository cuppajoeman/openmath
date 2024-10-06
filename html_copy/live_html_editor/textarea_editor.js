const editorIndentSpaces = 4;
const indent = " ".repeat(editorIndentSpaces);
const unIndentPattern = new RegExp(`^ {${editorIndentSpaces}}`);

function configure_textarea_as_basic_editor(textarea_element) {
  textarea_element.addEventListener("keydown", ev => {
    const textarea = ev.target;
    const v = textarea.value;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    if (ev.key === "Tab") {
      ev.preventDefault(); //stop the focus from changing
      const isUnIndenting = ev.shiftKey;

      if (startPos === endPos) {
        //nothing selected, just indent/unindent where the cursor is
        let newCursorPos;
        const lineStartPos = v.slice(0, startPos).lastIndexOf("\n") + 1;
        const lineEndPos = v.slice(lineStartPos, v.length).indexOf("/n");
        if (isUnIndenting) {
          const newLineContent = v
            .slice(lineStartPos, lineEndPos)
            .replace(unIndentPattern, "");
          textarea.value =
            v.slice(0, lineStartPos) + newLineContent + v.slice(lineEndPos);
          newCursorPos = Math.max(startPos - editorIndentSpaces, lineStartPos);
        } else {
          textarea.value =
            v.slice(0, lineStartPos) + indent + v.slice(lineStartPos);
          newCursorPos = startPos + editorIndentSpaces;
        }
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      } else {
        //Indent/unindent the selected text
        const lineStartPos = v.slice(0, startPos).lastIndexOf("\n") + 1;
        const selection = v.substring(lineStartPos, endPos);
        let result = "";
        const lines = selection.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (isUnIndenting) {
            //unindent selected lines
            result += lines[i].replace(unIndentPattern, "");
          } else {
            //Indent selected lines
            result += indent + lines[i];
          }

          if (i < lines.length - 1) {
            //add line breaks after all but the last line
            result += "\n";
          }
        }

        textarea.value = v.split(selection).join(result);
        if (isUnIndenting) {
          textarea.setSelectionRange(
            Math.max(startPos - editorIndentSpaces, lineStartPos),
            lineStartPos + result.length
          );
        } else {
          textarea.setSelectionRange(
            startPos + editorIndentSpaces,
            lineStartPos + result.length
          );
        }
      }
    } else if (ev.key === "Enter") {
      //When enter is pressed, maintain the current indentation level

      //We will place the newline character manually, this stops it from being typed
      ev.preventDefault();

      //Get the current indentation level and prefix the new line with the same
      const prevLinePos = v.slice(0, startPos).lastIndexOf("\n") + 1;
      const prevLine = v.slice(prevLinePos, endPos);
      const levels = prevLine.match(/^ */)[0].length / editorIndentSpaces;
      const indentation = indent.repeat(levels);
      textarea.value =
        v.slice(0, endPos) + "\n" + indentation + v.slice(endPos);

      //Set the cursor position
      const newCursorPos = endPos + 1 + indentation.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }
  });
}
