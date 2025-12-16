export function formatDate(dateString) {
  const now = new Date();

  const date = new Date(dateString);
  const diff = now - date;
  const diffInSeconds = Math.floor(diff / 1000);

  if (diffInSeconds > 2592000) {
    return date.toLocaleDateString();
  } else if (diffInSeconds > 86400) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} days ago`;
  } else if (diffInSeconds > 3600) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} H ago`;
  } else if (diffInSeconds > 60) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} Min ago`;
  } else {
    return "Just now";
  }
}

export function formatDuration(durationString) {
  let result = "";

  if (typeof durationString == "string") {
    const regex = /P(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = durationString.match(regex);

    const days = matches[1] ? parseInt(matches[1]) : 0;
    const hours = matches[2] ? parseInt(matches[2]) : 0;
    const minutes = matches[3] ? parseInt(matches[3]) : 0;
    if (days > 0) result += `${days} day${days > 1 ? "s" : ""} `;
    if (hours > 0) result += `${hours} hour${hours > 1 ? "s" : ""} `;
    if (minutes > 0) result += `${minutes} min${minutes > 1 ? "s" : ""}`;
  } else result = `${durationString} day${durationString > 1 ? "s" : ""}`;
  return result.trim() || "0 mins";
}

export function process_data(element) {
  element.creation_date = formatDate(element.creation_date);
  element.last_modification = formatDate(element.last_modification);

  if (element.duration) {
    element.duration = formatDuration(element.duration);
  }
  return element;
}
