import { emit } from "@tauri-apps/api/event";
import { Note } from "../lib/models";
import { supabase } from "./supabaseClient";

export async function getSearch(searchInput: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select()
    .like("note_text", `%${searchInput}%`);

  if (error) {
    // todo: log error somewhere
    console.log(error);
  }

  return (data as Note[]) || [];
}

export async function addNoteDB() {
  const userID = (await supabase.auth.getUser())?.data?.user?.id;
  const { data, error } = await supabase
    .from("notes")
    .insert([{ user_id: userID }])
    .select();

  if (error) {
    // todo: log error somewhere
    console.log(error);
  }

  console.log(data);

  return data;
}

export async function updateNoteDB(uuid: string, text: string) {
  const { data, error } = await supabase
    .from("notes")
    .update({ note_text: text })
    .eq("note_id", uuid)
    .select();

  if (error) {
    // todo: log error somewhere
    console.log(error);
  }

  await emit("db", { message: "save" });

  return data;
}

export async function removeNoteDB(uuid: string) {
  const { error } = await supabase.from("notes").delete().eq("note_id", uuid);

  if (error) {
    // todo: log error somewhere
    console.log(error);
  }
}
