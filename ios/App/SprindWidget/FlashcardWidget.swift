import WidgetKit
import SwiftUI
import AppIntents

// Home-screen flashcard: the word being learned, its translation and picture.
// Arrows page through the list the app chose (Manage Account → Home-screen
// widget); tapping the card plays the word, tapping again stops it.
// Every copy of the widget shows the same card.

@main
struct SprindWidgetBundle: WidgetBundle {
    var body: some Widget {
        FlashcardWidget()
    }
}

struct FlashcardWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WidgetShared.kind, provider: FlashcardProvider()) { entry in
            FlashcardWidgetView(entry: entry)
        }
        .configurationDisplayName("Sprind flashcard")
        .description("A word to learn on your home screen. Tap it to hear it.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}

struct FlashcardEntry: TimelineEntry {
    let date: Date
    let deck: WidgetDeck?
    let index: Int
    let playingId: Int?

    static let sample = FlashcardEntry(
        date: Date(),
        deck: WidgetDeck(key: "sample", label: "Sprind", empty: "", words: [
            WidgetWord(id: 0, word: "¡Hola!", translation: "Hello", audio: nil, image: nil),
        ]),
        index: 0,
        playingId: nil
    )
}

struct FlashcardProvider: TimelineProvider {
    func placeholder(in context: Context) -> FlashcardEntry {
        .sample
    }

    func getSnapshot(in context: Context, completion: @escaping (FlashcardEntry) -> Void) {
        let entry = current()
        completion(context.isPreview && entry.deck == nil ? .sample : entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FlashcardEntry>) -> Void) {
        let entry = current()
        var entries = [entry]
        // Put the play icon back when the clip ends, even if the app never says so
        if entry.playingId != nil, let until = WidgetStore.playingUntil {
            entries.append(FlashcardEntry(date: until, deck: entry.deck, index: entry.index, playingId: nil))
        }
        completion(Timeline(entries: entries, policy: .never))
    }

    private func current() -> FlashcardEntry {
        let deck = WidgetStore.load()
        return FlashcardEntry(
            date: Date(),
            deck: deck,
            index: deck.map { WidgetStore.index(in: $0) } ?? 0,
            playingId: WidgetStore.playingId
        )
    }
}

// MARK: - Views

private let glassFill = Color.white.opacity(0.15)
private let glassStroke = Color.white.opacity(0.25)

/// The app's dark-to-orange glow (public/bg.jpeg)
private let backdrop = LinearGradient(
    colors: [
        Color(red: 0.165, green: 0.129, blue: 0.208),
        Color(red: 0.851, green: 0.282, blue: 0.110),
        Color(red: 0.976, green: 0.694, blue: 0.118),
    ],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
)

struct FlashcardWidgetView: View {
    let entry: FlashcardEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        Group {
            if let deck = entry.deck, !deck.words.isEmpty {
                card(deck: deck, word: deck.words[min(entry.index, deck.words.count - 1)])
            } else {
                Text(entry.deck?.empty.isEmpty == false ? entry.deck!.empty : "Open Sprind to choose words for this widget.")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding(14)
            }
        }
        .containerBackground(for: .widget) { backdrop }
    }

    private func card(deck: WidgetDeck, word: WidgetWord) -> some View {
        let playing = entry.playingId == word.id
        return VStack(spacing: 6) {
            HStack(spacing: 4) {
                Text(deck.label.isEmpty ? "Sprind" : deck.label)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.85))
                    .lineLimit(1)
                Spacer(minLength: 4)
                Button(intent: PlayWordIntent(wordId: word.id)) {
                    Image(systemName: playing ? "stop.fill" : "speaker.wave.2.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(glassFill))
                        .overlay(Circle().stroke(glassStroke, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }

            Button(intent: PlayWordIntent(wordId: word.id)) {
                cardBody(word: word)
                    .padding(6)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(glassFill))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(glassStroke, lineWidth: 1))
            }
            .buttonStyle(.plain)

            HStack {
                arrow("chevron.left", intent: PreviousWordIntent())
                Spacer()
                Text("\(entry.index + 1) / \(deck.words.count)")
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.white.opacity(0.7))
                Spacer()
                arrow("chevron.right", intent: NextWordIntent())
            }
        }
        .padding(10)
    }

    @ViewBuilder
    private func cardBody(word: WidgetWord) -> some View {
        let image = WidgetStore.imageURL(for: word.id).flatMap { UIImage(contentsOfFile: $0.path) }
        if family == .systemMedium {
            HStack(spacing: 10) {
                if let image {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: .infinity)
                }
                texts(word: word, alignment: image == nil ? .center : .leading)
                    .frame(maxWidth: .infinity, alignment: image == nil ? .center : .leading)
            }
        } else {
            VStack(spacing: 2) {
                if let image {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: .infinity)
                }
                texts(word: word, alignment: .center)
            }
        }
    }

    private func texts(word: WidgetWord, alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: 1) {
            Text(word.word)
                .font(.system(size: family == .systemMedium ? 22 : 17, weight: .bold, design: .rounded))
                .minimumScaleFactor(0.6)
                .lineLimit(2)
            if !word.translation.isEmpty {
                Text(word.translation)
                    .font(family == .systemMedium ? .subheadline : .caption)
                    .opacity(0.8)
                    .lineLimit(family == .systemMedium ? 2 : 1)
            }
        }
        .foregroundStyle(.white)
        .multilineTextAlignment(alignment == .leading ? .leading : .center)
    }

    private func arrow<I: AppIntent>(_ symbol: String, intent: I) -> some View {
        Button(intent: intent) {
            Image(systemName: symbol)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Circle().fill(glassFill))
                .overlay(Circle().stroke(glassStroke, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
