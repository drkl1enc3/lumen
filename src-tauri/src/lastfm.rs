use reqwest::Client;
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;

const API_URL: &str = "https://ws.audioscrobbler.com/2.0/";

pub struct LastFmState {
    client: Client,
}

impl LastFmState {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .user_agent("Lumen/0.2 (music player)")
                .build()
                .unwrap_or_default(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LastFmSession {
    pub session_key: String,
    pub username: String,
}

fn sign(params: &BTreeMap<String, String>, secret: &str) -> String {
    let mut data = String::new();
    for (key, value) in params {
        if key == "format" || key == "callback" {
            continue;
        }
        data.push_str(key);
        data.push_str(value);
    }
    data.push_str(secret);
    format!("{:x}", md5::compute(data.as_bytes()))
}

async fn call(
    client: &Client,
    method: &str,
    api_key: &str,
    api_secret: &str,
    mut params: BTreeMap<String, String>,
) -> Result<Value, String> {
    if api_key.trim().is_empty() || api_secret.trim().is_empty() {
        return Err("Не заданы API key и секрет Last.fm".to_string());
    }
    params.insert("method".to_string(), method.to_string());
    params.insert("api_key".to_string(), api_key.trim().to_string());
    params.insert("format".to_string(), "json".to_string());
    let api_sig = sign(&params, api_secret.trim());
    params.insert("api_sig".to_string(), api_sig);

    let response = client
        .get(API_URL)
        .query(&params)
        .send()
        .await
        .map_err(|error| format!("Нет связи с Last.fm: {error}"))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Не удалось прочитать ответ Last.fm: {error}"))?;
    let value: Value = serde_json::from_str(&body)
        .map_err(|_| format!("Last.fm вернул некорректный ответ ({status})"))?;

    if let Some(error) = value.get("error") {
        let message = value
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("неизвестная ошибка");
        return Err(format!("Last.fm: {message} ({error})"));
    }
    if !status.is_success() {
        return Err(format!("Last.fm вернул HTTP {status}"));
    }
    Ok(value)
}

#[tauri::command]
pub async fn lastfm_get_token(
    state: tauri::State<'_, LastFmState>,
    api_key: String,
    api_secret: String,
) -> Result<String, String> {
    let value = call(
        &state.client,
        "auth.getToken",
        &api_key,
        &api_secret,
        BTreeMap::new(),
    )
    .await?;
    value
        .get("token")
        .and_then(Value::as_str)
        .map(ToString::to_string)
        .ok_or_else(|| "Last.fm не вернул токен".to_string())
}

#[tauri::command]
pub async fn lastfm_get_session(
    state: tauri::State<'_, LastFmState>,
    api_key: String,
    api_secret: String,
    token: String,
) -> Result<LastFmSession, String> {
    let mut params = BTreeMap::new();
    params.insert("token".to_string(), token);
    let value = call(
        &state.client,
        "auth.getSession",
        &api_key,
        &api_secret,
        params,
    )
    .await?;
    let session = value
        .get("session")
        .ok_or_else(|| "Last.fm не вернул сессию".to_string())?;
    Ok(LastFmSession {
        session_key: session
            .get("key")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        username: session
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
    })
}

#[tauri::command]
pub async fn lastfm_now_playing(
    state: tauri::State<'_, LastFmState>,
    api_key: String,
    api_secret: String,
    session_key: String,
    artist: String,
    track: String,
    album: Option<String>,
    duration: Option<u64>,
) -> Result<(), String> {
    if session_key.trim().is_empty() {
        return Err("Last.fm не подключён".to_string());
    }
    let mut params = BTreeMap::new();
    params.insert("artist".to_string(), artist);
    params.insert("track".to_string(), track);
    params.insert("sk".to_string(), session_key);
    if let Some(album) = album.filter(|value| !value.trim().is_empty()) {
        params.insert("album".to_string(), album);
    }
    if let Some(duration) = duration.filter(|value| *value > 0) {
        params.insert("duration".to_string(), duration.to_string());
    }
    call(
        &state.client,
        "track.updateNowPlaying",
        &api_key,
        &api_secret,
        params,
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn lastfm_scrobble(
    state: tauri::State<'_, LastFmState>,
    api_key: String,
    api_secret: String,
    session_key: String,
    artist: String,
    track: String,
    album: Option<String>,
    duration: Option<u64>,
    timestamp: u64,
) -> Result<(), String> {
    if session_key.trim().is_empty() {
        return Err("Last.fm не подключён".to_string());
    }
    let mut params = BTreeMap::new();
    params.insert("artist".to_string(), artist);
    params.insert("track".to_string(), track);
    params.insert("sk".to_string(), session_key);
    params.insert("timestamp".to_string(), timestamp.to_string());
    if let Some(album) = album.filter(|value| !value.trim().is_empty()) {
        params.insert("album".to_string(), album);
    }
    if let Some(duration) = duration.filter(|value| *value > 0) {
        params.insert("duration".to_string(), duration.to_string());
    }
    call(
        &state.client,
        "track.scrobble",
        &api_key,
        &api_secret,
        params,
    )
    .await
    .map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signature_matches_documented_lastfm_example() {
        let mut params = BTreeMap::new();
        params.insert("method".to_string(), "auth.getSession".to_string());
        params.insert("api_key".to_string(), "YOUR_API_KEY".to_string());
        params.insert("token".to_string(), "YOUR_REQUESTED_TOKEN".to_string());
        params.insert("format".to_string(), "json".to_string());
        assert_eq!(
            sign(&params, "YOUR_SECRET"),
            "94539006de89b3c6b3c030bb1e52b9c4"
        );
    }
}
