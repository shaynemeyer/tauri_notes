import { invoke } from "@tauri-apps/api";
import { writeText } from "@tauri-apps/api/clipboard";
import { ChangeEvent, useEffect, useState } from "react";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/api/notification";
import { useLoaderData } from "react-router-dom";
import Database from "tauri-plugin-sql-api";
import { updateNoteDB } from "./db";
import { listen } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/api/dialog";
import { writeTextFile } from "@tauri-apps/api/fs";
import { dbName } from "./lib/constants";

export async function loader({
  params,
}: {
  params: {
    noteId: string;
  };
}) {
  const { noteId } = params;
  return { noteUUID: noteId };
}

function Editor() {
  const { noteUUID } = useLoaderData() as unknown as { noteUUID: string };
  const [note, setNote] = useState("No text");
  const [isRendered, setRender] = useState(false);
  const [db, setDb] = useState<Database | null>(null);
  const [menuEventPayload, setMenuEventPayload] = useState<{
    payload: string;
    id: string;
  }>({ payload: "", id: "" });

  const [markdownHTML, setMarkdownHTML] = useState<
    | {
        // Should be InnerHTML['innerHTML'].
        // But unfortunately we're mixing renderer-specific type declarations.
        __html: string | TrustedHTML;
      }
    | undefined
  >();

  useEffect(() => {
    loadNoteFromDB();

    let unlisten;

    unlisten = listen("tauri://menu", (e) => {
      setMenuEventPayload({ payload: String(e.payload), id: String(e.id) });
    });

    return () => {
      if (unlisten) {
        unlisten.then(
          (resolvedUnlisten) =>
            typeof resolvedUnlisten === "function" && resolvedUnlisten()
        );
      }
    };
  }, []);

  useEffect(() => {
    if (menuEventPayload.payload === "" && menuEventPayload.id === "") return;

    const menuPayload = menuEventPayload.payload;

    switch (menuPayload) {
      case "export":
        saveToFile();
        break;
      default:
        break;
    }
  }, [menuEventPayload]);

  async function saveToFile() {
    try {
      let filepath = (await save({
        filters: [
          { name: "Markdown", extensions: ["md"] },
          { name: "Picture", extensions: ["png", "jpeg"] },
        ],
      })) as string;
      await writeTextFile({ contents: note, path: filepath });
    } catch (e) {
      console.log(e);
    }
  }

  function editNote(e: ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
  }

  async function loadNoteFromDB() {
    const loadedDB = await Database.load(dbName);
    const result = (await loadedDB.select(
      "SELECT * FROM notes WHERE note_id = $1",
      [noteUUID]
    )) as { note_id: string; note_text: string }[];

    setNote(result[0].note_text as string);

    setDb(loadedDB);
  }

  async function renderMarkdown() {
    if (!isRendered) {
      const response: string = await invoke("convert_markdown", { text: note });
      setMarkdownHTML({ __html: response });
      writeText(response);
    }

    setRender(!isRendered);
  }

  return (
    <div className="m-2">
      <div className="flex justify-between items-center pb-2">
        <p className="mb-2">Editor</p>
        <div className="join">
          <label className="btn btn-sm join-item swap">
            <input
              type="checkbox"
              onChange={async () => {
                await renderMarkdown();
              }}
            />
            <div className="swap-on">HTML</div>
            <div className="swap-off">MD</div>
          </label>
          <button
            className="btn btn-sm join-item"
            onClick={async () => {
              await writeText(note);
              let permissionGranted = await isPermissionGranted();
              if (!permissionGranted) {
                const permission = await requestPermission();
                permissionGranted = permission === "granted";
              }

              if (permissionGranted) {
                sendNotification({ title: "Tauri", body: "Copy text." });
              }
            }}
          >
            Copy
          </button>

          <button
            className="btn btn-sm join-item"
            onClick={async () => {
              if (!db) {
                console.error("Database not loaded");
                return;
              }
              await updateNoteDB(db, noteUUID, note);
            }}
          >
            Save
          </button>
        </div>
      </div>
      {isRendered ? (
        <div className="prose" dangerouslySetInnerHTML={markdownHTML}></div>
      ) : (
        <textarea
          value={note}
          className="w-full"
          rows={20}
          onChange={editNote}
        />
      )}
    </div>
  );
}
export default Editor;
