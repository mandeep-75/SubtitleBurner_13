fn wrap_text_by_words(text: &str, max_words: u32) -> String {
    if max_words == 0 {
        return text.to_string();
    }

    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return text.to_string();
    }

    let mut lines = Vec::new();
    let mut current_line = Vec::new();
    let mut word_count = 0;

    for word in words {
        current_line.push(word);
        word_count += 1;

        if word_count >= max_words {
            lines.push(current_line.join(" "));
            current_line = Vec::new();
            word_count = 0;
        }
    }

    if !current_line.is_empty() {
        lines.push(current_line.join(" "));
    }

    lines.join("\n")
}

fn main() {
    let result1 = wrap_text_by_words("I am walking down the street", 1);
    println!("1 word per line:\n{}\n", result1);

    let result2 = wrap_text_by_words("I am walking down the street", 2);
    println!("2 words per line:\n{}\n", result2);

    let result3 = wrap_text_by_words("I am walking down the street", 3);
    println!("3 words per line:\n{}\n", result3);
}
