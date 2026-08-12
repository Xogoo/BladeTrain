<script setup>
import { computed, nextTick, reactive, ref } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { useCollection } from "../composables/useCollection.js";
import { resolveFamily, familyEntryKey } from "../game/families.js";
import { nameEntry } from "../game/trickGenerator.js";

const props = defineProps({
  dateKey: { type: String, required: true },
});
const emit = defineEmits(["close"]);

const { collection, ayaSaveSession, ayaDeleteSession, storageWriteError } = useCollection();

// Built-in, non-switch only — same 8 Soul + 18 Groove tricks either
// way, no customFamilies involved (Aya never trains anything else).
const soulFamily = resolveFamily("soul-normal", []);
const grooveFamily = resolveFamily("groove-normal", []);

const existingSession = computed(() => collection.ayaSessions[props.dateKey] || null);

// "summary": read-only recap of an already-saved day — just what was
// done, the note, the photo, no checklist to interact with (see
// AyaSessionPanel's whole reason for existing: a logbook, not another
// draw screen). "edit": the checklist + note + photo form, working
// entirely on a LOCAL draft below — nothing touches collection until
// "Enregistrer" is tapped. A brand new day (no existingSession yet)
// always starts in edit mode, since there's nothing to summarize.
const mode = ref(existingSession.value ? "summary" : "edit");

function blankDraft() {
  return { soul: {}, groove: {}, note: "", photo: null };
}
function draftFrom(session) {
  return {
    soul: { ...session.soul },
    groove: { ...session.groove },
    note: session.note,
    photo: session.photo,
  };
}

const draft = reactive(existingSession.value ? draftFrom(existingSession.value) : blankDraft());

function startEditing() {
  const fresh = existingSession.value ? draftFrom(existingSession.value) : blankDraft();
  draft.soul = fresh.soul;
  draft.groove = fresh.groove;
  draft.note = fresh.note;
  draft.photo = fresh.photo;
  mode.value = "edit";
}

function toggleDraftTrick(family, entryKey) {
  if (draft[family][entryKey]) {
    delete draft[family][entryKey];
  } else {
    draft[family][entryKey] = true;
  }
}

function doneNames(family, familyDef) {
  return familyDef.entries
    .filter((entry) => existingSession.value?.[family]?.[familyEntryKey(entry)])
    .map((entry) => nameEntry(entry));
}

function formatLongDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  return `${days[date.getDay()]} ${d} ${months[m - 1]}`;
}

// Resizes/compresses a photo before storing it — collection lives in
// localStorage (a few MB quota, shared with everything else BLADE
// tracks), so a raw phone-camera photo alone could blow past it.
// Capped at 900px wide, re-exported as JPEG, keeps a typical shot well
// under 200KB.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, 900 / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const fileInputRef = ref(null);
const confirmDelete = ref(false);
const photoError = ref(false);
const saveError = ref(false);

async function onPhotoChosen(e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  photoError.value = false;
  try {
    draft.photo = await compressImage(file);
  } catch {
    // Unreadable file — genuinely can't be read/decoded.
    photoError.value = true;
  }
}

async function onSave() {
  saveError.value = false;
  ayaSaveSession(props.dateKey, draft);
  // The actual localStorage write happens in a deep watcher, one tick
  // after this reactive mutation — checking storageWriteError
  // synchronously here would always read its PREVIOUS value.
  await nextTick();
  if (storageWriteError.value && draft.photo) {
    // Retry without the photo specifically — a photo is the one part
    // of a session large enough to realistically blow the quota; the
    // tricks/note are negligible by comparison and shouldn't be lost
    // over it.
    ayaSaveSession(props.dateKey, { ...draft, photo: null });
    await nextTick();
    saveError.value = true;
    return;
  }
  emit("close");
}

function onDelete() {
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  ayaDeleteSession(props.dateKey);
  emit("close");
}
</script>

<template>
  <AppModal :title="formatLongDate(dateKey)" @close="$emit('close')">
    <template v-if="mode === 'summary' && existingSession">
      <div class="aya-summary-group">
        <p class="aya-group__title">Soul</p>
        <p v-if="doneNames('soul', soulFamily).length" class="aya-summary-list">
          {{ doneNames('soul', soulFamily).join(", ") }}
        </p>
        <p v-else class="aya-summary-empty">Rien de noté.</p>
      </div>

      <div class="aya-summary-group">
        <p class="aya-group__title">Groove</p>
        <p v-if="doneNames('groove', grooveFamily).length" class="aya-summary-list">
          {{ doneNames('groove', grooveFamily).join(", ") }}
        </p>
        <p v-else class="aya-summary-empty">Rien de noté.</p>
      </div>

      <div v-if="existingSession.photo" class="aya-section">
        <img :src="existingSession.photo" alt="" class="aya-photo" />
      </div>

      <div v-if="existingSession.note" class="aya-section">
        <span class="aya-section__label">Notes</span>
        <p class="aya-summary-note">{{ existingSession.note }}</p>
      </div>

      <button class="btn aya-edit-btn" @click="startEditing">Modifier</button>

      <button
        class="btn btn--ghost aya-delete"
        :class="{ 'btn--confirm': confirmDelete }"
        @click="onDelete"
        @blur="confirmDelete = false"
      >
        <AppIcon name="flag" :size="14" />
        {{ confirmDelete ? "Confirmer la suppression" : "Supprimer cette session" }}
      </button>
    </template>

    <template v-else>
      <div class="aya-group">
        <p class="aya-group__title">Soul</p>
        <div class="aya-list">
          <button
            v-for="entry in soulFamily.entries"
            :key="familyEntryKey(entry)"
            class="aya-row"
            :class="{ 'aya-row--done': draft.soul[familyEntryKey(entry)] }"
            @click="toggleDraftTrick('soul', familyEntryKey(entry))"
          >
            <span class="aya-row__box">
              <AppIcon v-if="draft.soul[familyEntryKey(entry)]" name="check" :size="13" />
            </span>
            {{ nameEntry(entry) }}
          </button>
        </div>
      </div>

      <div class="aya-group">
        <p class="aya-group__title">Groove</p>
        <div class="aya-list">
          <button
            v-for="entry in grooveFamily.entries"
            :key="familyEntryKey(entry)"
            class="aya-row"
            :class="{ 'aya-row--done': draft.groove[familyEntryKey(entry)] }"
            @click="toggleDraftTrick('groove', familyEntryKey(entry))"
          >
            <span class="aya-row__box">
              <AppIcon v-if="draft.groove[familyEntryKey(entry)]" name="check" :size="13" />
            </span>
            {{ nameEntry(entry) }}
          </button>
        </div>
      </div>

      <div class="aya-section">
        <span class="aya-section__label">Photo</span>
        <div v-if="draft.photo" class="aya-photo-wrap">
          <img :src="draft.photo" alt="" class="aya-photo" />
          <button class="aya-photo__remove" @click="draft.photo = null">
            <AppIcon name="close" :size="14" />
          </button>
        </div>
        <button v-else class="aya-media-btn" @click="fileInputRef?.click()">
          + Ajouter une photo
        </button>
        <p v-if="photoError" class="aya-photo__error">
          Cette photo n'a pas pu être lue — essaie un autre fichier.
        </p>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          capture="environment"
          style="display: none"
          @change="onPhotoChosen"
        />
      </div>

      <div class="aya-section">
        <span class="aya-section__label">Notes</span>
        <textarea
          v-model="draft.note"
          class="aya-note"
          rows="3"
          placeholder="Comment s'est passée la session…"
        />
      </div>

      <p v-if="saveError" class="aya-photo__error">
        La session est enregistrée, mais la photo n'a pas pu l'être —
        l'espace de stockage est plein. Essaie de supprimer une ancienne
        photo d'une autre session d'abord.
      </p>

      <button class="btn btn--go aya-save-btn" @click="onSave">Enregistrer</button>

      <button
        v-if="existingSession"
        class="btn btn--ghost aya-delete"
        :class="{ 'btn--confirm': confirmDelete }"
        @click="onDelete"
        @blur="confirmDelete = false"
      >
        <AppIcon name="flag" :size="14" />
        {{ confirmDelete ? "Confirmer la suppression" : "Supprimer cette session" }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.aya-group {
  margin-bottom: 18px;
}

.aya-group__title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.aya-list {
  border-radius: 12px;
  border: 1px solid var(--line);
  overflow: hidden;
}

.aya-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-top: 1px solid var(--line);
  background: var(--bg-1);
  color: var(--text-dim);
  font-size: 14px;
  text-align: left;
}
.aya-row:first-child {
  border-top: none;
}
.aya-row--done {
  color: var(--text);
}

.aya-row__box {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid var(--line-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
}

.aya-summary-group {
  margin-bottom: 16px;
}
.aya-summary-list {
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
}
.aya-summary-empty {
  font-size: 13px;
  color: var(--text-dim);
  font-style: italic;
}
.aya-summary-note {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
  white-space: pre-wrap;
}

.aya-section {
  margin-top: 18px;
}

.aya-section__label {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-dim);
  letter-spacing: 0.08em;
}

.aya-media-btn {
  margin-top: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px dashed var(--line-strong);
  background: var(--panel);
  color: var(--text-dim);
  font-size: 13px;
  font-weight: 600;
}

.aya-photo-wrap {
  position: relative;
  margin-top: 8px;
}
.aya-photo {
  width: 100%;
  border-radius: 12px;
  display: block;
}
.aya-photo__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
}

.aya-photo__error {
  margin-top: 8px;
  font-size: 12px;
  color: var(--danger-hi);
}

.aya-note {
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--line-strong);
  background: var(--bg-2);
  color: var(--text);
  font-size: 14px;
  font-family: var(--font-body);
  resize: vertical;
  box-sizing: border-box;
}

.aya-edit-btn {
  margin-top: 24px;
  width: 100%;
}

.aya-save-btn {
  margin-top: 24px;
  width: 100%;
}

.aya-delete {
  margin-top: 12px;
  width: 100%;
  font-size: 13px;
}
</style>