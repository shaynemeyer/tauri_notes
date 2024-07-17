import { emit } from "@tauri-apps/api/event";
import Database from "tauri-plugin-sql-api";
import { Note } from "./lib/models";

export async function getSearch(
  db: Database,
  searchInput: string
): Promise<Note[]> {
  const result = await db.select(
    `SELECT * FROM notes WHERE note_text like '%${searchInput}%'`
  );
  return (result as Note[]) || [];
}

export async function addNoteDB(db: Database, uuid: string, text: string) {
  const result = await db.execute(
    "INSERT into notes (note_id, note_text) VALUES ($1, $2);",
    [uuid, text]
  );
  return result;
}

export async function updateNoteDB(db: Database, uuid: string, text: string) {
  const result = await db.execute(
    "UPDATE notes set note_text = $2 WHERE note_id = $1;",
    [uuid, text]
  );
  await emit("db", { message: "save" });

  return result;
}

export async function removeNoteDB(db: Database, uuid: string) {
  const result = await db.execute("DELETE FROM notes WHERE note_id = $1;", [
    uuid,
  ]);
  return result;
}
