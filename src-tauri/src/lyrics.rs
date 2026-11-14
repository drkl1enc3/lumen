use serde::Serialize;
use serde_json::Value;
use std::time::Duration;

const LRCLIB_GET: &str = "https://lrclib.net/api/get";
const LRCLIB_SEARCH: &str = "https://lrclib.net/api/search";

pub struct LyricsState {
    client: reqwest::Client,
}

impl LyricsState {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .user_agent("Lumen/0.2 (music player)")
                .timeout(Duration::from_secs(12))
                .build()
                .unwrap_or_default(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Lyrics {
    pub plain: Option<String>,
    pub synced: Option<String>,
    pub source: String,
}

fn parse_lyrics(value: &Value) -> Option<Lyrics> {
    let plain = value
        .get("plainLyrics")
        .and_then(Value::as_str)
        .filter(|text| !text.trim().is_empty())
        .map(ToString::to_string);
    let synced = value
        .get("syncedLyrics")
        .and_then(Value::as_str)
        .filter(|text| !text.trim().is_empty())
        .map(ToString::to_string);
    if plain.is_none() && synced.is_none() {
        return None;
    }
    Some(Lyrics {
        plain,
        synced,
        source: "LRCLIB".to_string(),
    })
}

#[tauri::command]
pub async fn fetch_lyrics(
    state: tauri::State<'_, LyricsState>,
    title: String,
    artist: String,
    album: Option<String>,
    duration: Option<u64>,
) -> Result<Option<Lyrics>, String> {
    if title.trim().is_empty() || artist.trim().is_empty() {
        return Ok(None);
    }

    let mut query: Vec<(&str, String)> = vec![
        ("track_name", title.trim().to_string()),
        ("artist_name", artist.trim().to_string()),
    ];
    if let Some(album) = album.filter(|value| !value.trim().is_empty()) {
        query.push(("album_name", album));
    }
    if let Some(duration) = duration.filter(|value| *value > 0) {
        query.push(("duration", duration.to_string()));
    }

    if let Ok(response) = state.client.get(LRCLIB_GET).query(&query).send().await {
        if response.status().is_success() {
            if let Ok(value) = response.json::<Value>().await {
                if let Some(lyrics) = parse_lyrics(&value) {
                    return Ok(Some(lyrics));
                }
            }
        }
    }

    let search_query: Vec<(&str, String)> = vec![
        ("track_name", title.trim().to_string()),
        ("artist_name", artist.trim().to_string()),
    ];
    if let Ok(response) = state
        .client
        .get(LRCLIB_SEARCH)
        .query(&search_query)
        .send()
        .await
    {
        if response.status().is_success() {
            if let Ok(values) = response.json::<Vec<Value>>().await {
                if let Some(lyrics) = values.iter().find_map(parse_lyrics) {
                    return Ok(Some(lyrics));
                }
            }
        }
    }

    Ok(None)
}
