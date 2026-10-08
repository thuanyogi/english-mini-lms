"use client";

import { useState } from "react";
import { KNOWN_TOPICS, getTopicMeta, slugifyTopic } from "@/lib/topics";
import { Field, inputCls } from "./form-ui";

const NEW_TOPIC = "__new__";

/** Dropdown chủ đề (đã chốt + đang dùng) và cho phép gõ chủ đề mới → tự đổi thành slug. */
export default function TopicPicker({
  value,
  existingTopics,
  onChange,
}: {
  value: string;
  existingTopics: string[];
  onChange: (slug: string) => void;
}) {
  const known = KNOWN_TOPICS.map((t) => t.key);
  const options = Array.from(new Set([...known, ...existingTopics, ...(value ? [value] : [])]));
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const slug = slugifyTopic(newName);

  return (
    <div className="space-y-2">
      <Field label="Chủ đề (topic)">
        <select
          className={inputCls}
          value={creating ? NEW_TOPIC : value}
          onChange={(e) => {
            if (e.target.value === NEW_TOPIC) {
              setCreating(true);
              onChange(slug);
            } else {
              setCreating(false);
              onChange(e.target.value);
            }
          }}
        >
          <option value="">🗂️ Chưa phân loại</option>
          {options.map((key) => {
            const meta = getTopicMeta(key);
            return (
              <option key={key} value={key}>
                {meta.icon} {meta.name}
              </option>
            );
          })}
          <option value={NEW_TOPIC}>＋ Chủ đề mới…</option>
        </select>
      </Field>
      {creating && (
        <Field
          label="Tên chủ đề mới"
          hint={slug ? `Sẽ lưu thành: ${slug}` : "Nhập tên (chữ/số, bỏ dấu tự động)"}
        >
          <input
            className={inputCls}
            value={newName}
            placeholder="vd: Siêu âm tim"
            onChange={(e) => {
              setNewName(e.target.value);
              onChange(slugifyTopic(e.target.value));
            }}
          />
        </Field>
      )}
    </div>
  );
}
