import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, LogIn, Plus, UserPlus, Users, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUI } from "../store/ui";
import { useLibrary } from "../store/library";
import { Cover, IconButton, Modal, ModalHeader } from "./ui";
import { pluralTracks } from "../lib/utils";

export function CreatePlaylistDialog() {
  const { t } = useTranslation();
  const open = useUI((s) => s.createPlaylistOpen);
  const setOpen = useUI((s) => s.setCreatePlaylist);
  const toast = useUI((s) => s.toast);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    createPlaylist(name.trim(), description.trim() || undefined);
    toast(t("toast.created"), "success");
    setName("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} className="dialog" labelledBy="create-playlist-title">
      <ModalHeader
        id="create-playlist-title"
        title={t("playlist.createTitle")}
        onClose={() => setOpen(false)}
      />
      <div className="dialog-body">
        <label className="field">
          <span>{t("playlist.namePlaceholder")}</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("playlist.namePlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>
        <label className="field">
          <span>{t("playlist.descriptionPlaceholder")}</span>
          <textarea
            value={description}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("playlist.descriptionPlaceholder")}
          />
        </label>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-primary" disabled={!name.trim()} onClick={submit}>
            {t("common.create")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function AddToPlaylistDialog() {
  const { t, i18n } = useTranslation();
  const trackId = useUI((s) => s.addToPlaylistTrackId);
  const setTrack = useUI((s) => s.setAddToPlaylist);
  const setCreate = useUI((s) => s.setCreatePlaylist);
  const toast = useUI((s) => s.toast);
  const playlists = useLibrary((s) => s.playlists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const close = () => setTrack(null);

  return (
    <Modal open={Boolean(trackId)} onClose={close} className="dialog" labelledBy="add-to-playlist-title">
      <ModalHeader id="add-to-playlist-title" title={t("common.addToPlaylist")} onClose={close} />
      <div className="dialog-body">
        <div className="playlist-picker">
          {playlists.map((p) => (
            <button
              key={p.id}
              className="playlist-picker-row"
              onClick={() => {
                if (trackId) addToPlaylist(p.id, trackId);
                toast(t("toast.addedToPlaylist"), "success");
                close();
              }}
            >
              <Cover seed={p.cover} className="picker-cover" />
              <span className="picker-text">
                <span className="picker-title">{p.name}</span>
                <span className="picker-sub">{pluralTracks(p.trackIds.length, i18n.language)}</span>
              </span>
              <Plus size={16} />
            </button>
          ))}
        </div>
        <button
          className="playlist-picker-row is-create"
          onClick={() => {
            close();
            setCreate(true);
          }}
        >
          <span className="picker-cover placeholder">
            <Plus size={18} />
          </span>
          <span className="picker-text">
            <span className="picker-title">{t("library.newPlaylist")}</span>
          </span>
        </button>
      </div>
    </Modal>
  );
}

export function ListenTogetherDialog() {
  const { t } = useTranslation();
  const open = useUI((s) => s.listenTogetherOpen);
  const setOpen = useUI((s) => s.setListenTogether);
  const toast = useUI((s) => s.toast);
  const [mode, setMode] = useState<"idle" | "create" | "join" | "room">("idle");
  const [code, setCode] = useState("");
  const room = "LUMEN-42";

  const close = () => {
    setOpen(false);
    setMode("idle");
  };

  return (
    <Modal open={open} onClose={close} className="dialog together-dialog" labelledBy="together-title">
      <ModalHeader id="together-title" title={t("together.title")} subtitle={t("together.hint")} onClose={close} />
      <div className="dialog-body">
        {mode !== "room" && (
          <>
            <div className="together-hero">
              <span className="together-icon">
                <Users size={26} />
              </span>
              <div>
                <p className="together-title">{t("home.listenTogether")}</p>
                <p className="together-sub">{t("home.listenTogetherHint")}</p>
              </div>
            </div>
            <div className="together-grid">
              <button className="together-option" onClick={() => setMode("create")}>
                <span className="together-option-icon">
                  <UserPlus size={20} />
                </span>
                <span className="together-option-title">{t("together.create")}</span>
                <span className="together-option-sub">{t("together.hint")}</span>
              </button>
              <button className="together-option" onClick={() => setMode("join")}>
                <span className="together-option-icon">
                  <LogIn size={20} />
                </span>
                <span className="together-option-title">{t("together.join")}</span>
                <span className="together-option-sub">{t("together.codePlaceholder")}</span>
              </button>
            </div>
            {mode === "join" && (
              <div className="together-form">
                <input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t("together.codePlaceholder")}
                  className="together-input"
                />
                <button
                  className="btn btn-primary"
                  disabled={!code.trim()}
                  onClick={() => {
                    setMode("room");
                    toast(t("together.joined"), "success");
                  }}
                >
                  {t("together.joinRoom")}
                </button>
              </div>
            )}
          </>
        )}

        {mode === "room" && (
          <div className="together-room">
            <div className="together-room-code">
              <span>{t("together.roomCode")}</span>
              <strong>{room}</strong>
              <IconButton
                label={t("together.copyCode")}
                size="sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(room).catch(() => undefined);
                  toast(t("toast.copied"));
                }}
              >
                <Copy size={15} />
              </IconButton>
            </div>
            <div className="together-members">
              <p className="together-members-title">{t("together.members")}</p>
              <div className="together-member">
                <span className="member-avatar">
                  <UserPlus size={16} />
                </span>
                <span>{t("together.you")}</span>
                <span className="member-tag">{t("together.host")}</span>
                <Wifi size={14} className="member-online" />
              </div>
              <div className="together-member is-muted">
                <span className="member-avatar">
                  <UserPlus size={16} />
                </span>
                <span>{t("together.guest")}</span>
                <span className="member-tag">—</span>
              </div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setMode("idle");
                toast(t("together.leave"));
              }}
            >
              {t("together.leave")}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function LoginDialog() {
  const { t } = useTranslation();
  const open = useUI((s) => s.loginOpen);
  const setOpen = useUI((s) => s.setLogin);
  const toast = useUI((s) => s.toast);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const close = () => setOpen(false);

  return (
    <Modal open={open} onClose={close} className="dialog login-dialog" labelledBy="login-title">
      <ModalHeader id="login-title" title={t("login.title")} subtitle={t("login.hint")} onClose={close} />
      <div className="dialog-body">
        <div className="login-badge">
          <Users size={22} />
          <span>{t("login.benefits")}</span>
        </div>
        <label className="field">
          <span>{t("login.email")}</span>
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>{t("login.password")}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim() && password.trim()) {
                toast(t("toast.loginDemo"), "success");
                close();
              }
            }}
          />
        </label>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={close}>
            {t("login.skip")}
          </button>
          <button
            className="btn btn-primary"
            disabled={!email.trim() || !password.trim()}
            onClick={() => {
              toast(t("toast.loginDemo"), "success");
              close();
            }}
          >
            {t("login.submit")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
