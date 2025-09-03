import { useState } from 'react';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { useEchoModelProviders } from '@merit-systems/echo-react-sdk';

type SportsEvent = {
  category: 'NFL' | 'College Football' | 'NBA' | 'MLB' | 'NHL' | 'Tennis' | 'Soccer' | 'Other';
  headline: string;
  description: string;
  significance: 'High' | 'Medium' | 'Low';
  teams?: string[];
  date?: string;
  source?: string;
  links?: string[];
};

type SportsNews = {
  events: SportsEvent[];
  summary: string;
  barTalk: string[];
};

// Lazy JSON parser that attempts to parse partial JSON
const tryParsePartialJSON = (text: string): Partial<SportsNews> | null => {
  // Try parsing complete JSON first
  try {
    return JSON.parse(text);
  } catch {
    // If that fails, try to extract and parse partial structures
    try {
      // Try to extract summary
      const summaryMatch = text.match(/"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      const summary = summaryMatch ? summaryMatch[1].replace(/\\"/g, '"') : undefined;

      // Try to extract events array (even if incomplete)
      const eventsMatch = text.match(/"events"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
      let events: SportsEvent[] = [];
      
      if (eventsMatch) {
        const eventsStr = eventsMatch[1];
        // Split by complete event objects
        const eventMatches = eventsStr.match(/\{[^}]*"headline"[^}]*\}/g) || [];
        events = eventMatches.map(eventStr => {
          try {
            return JSON.parse(eventStr);
          } catch {
            // Extract individual fields manually if JSON parsing fails
            const categoryMatch = eventStr.match(/"category"\s*:\s*"([^"]*)"/);
            const headlineMatch = eventStr.match(/"headline"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
            const descriptionMatch = eventStr.match(/"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
            const significanceMatch = eventStr.match(/"significance"\s*:\s*"([^"]*)"/);
            
            return {
              category: categoryMatch?.[1] || 'Other',
              headline: headlineMatch?.[1].replace(/\\"/g, '"') || 'Loading...',
              description: descriptionMatch?.[1].replace(/\\"/g, '"') || 'Loading...',
              significance: (significanceMatch?.[1] as 'High' | 'Medium' | 'Low') || 'Medium',
            } as SportsEvent;
          }
        }).filter(event => event.headline !== 'Loading...');
      }

      // Try to extract barTalk array
      const barTalkMatch = text.match(/"barTalk"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
      let barTalk: string[] = [];
      
      if (barTalkMatch) {
        const barTalkStr = barTalkMatch[1];
        const talkMatches = barTalkStr.match(/"([^"]*(?:\\.[^"]*)*)"/g) || [];
        barTalk = talkMatches.map(match => match.slice(1, -1).replace(/\\"/g, '"'));
      }

      return { summary, events, barTalk };
    } catch {
      return null;
    }
  }
};

export default function AIComponent() { 
    const [sportsNews, setSportsNews] = useState<SportsNews | null>(null);
    const [partialData, setPartialData] = useState<Partial<SportsNews> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { anthropic: echoAnthropic } = useEchoModelProviders();

    const handleSportsSearch = async () => {
        setLoading(true);
        setError(null);
        setSportsNews(null);
        setPartialData(null);
        
        try {
            const webSearchTool = anthropic.tools.webSearch_20250305({
                maxUses: 5,
            });

            const { textStream } = await streamText({
                model: await echoAnthropic('claude-sonnet-4-20250514'),
                prompt: `Search for the latest US sports news and events from the past week. Focus on major leagues like NFL, NBA, MLB, NHL, college sports, and other significant sporting events.

After searching, provide your response in the following JSON format ONLY (no other text):

{
  "summary": "Brief overall summary of the current sports landscape",
  "events": [
    {
      "category": "NFL|College Football|NBA|MLB|NHL|Tennis|Soccer|Other",
      "headline": "Compelling headline for the sports event",
      "description": "Brief description of what happened",
      "significance": "High|Medium|Low",
      "teams": ["Team1", "Team2"],
      "date": "Date if known",
      "source": "News source if available",
      "links": ["https://example.com/article1", "https://example.com/article2"]
    }
  ],
  "barTalk": [
    "Witty, clever one-liner about a recent sports event that would be perfect to share with friends at a bar",
    "Another sharp observation about sports drama that friends would find amusing",
    "A third clever comment mixing sports knowledge with humor"
  ]
}

CONTENT REQUIREMENTS:
- Headlines: Make them SHARP and attention-grabbing, like a great sports Twitter account
- Descriptions: Pack them with context, drama, stakes, and why people care. Include specific stats, money involved, career implications, historical context
- Bar Talk: 15 words max, SAVAGE and quotable. Think Pat McAfee meets Barstool. Include specific names, numbers, comparisons

SEARCH CONSTRAINTS: 
- Only TOP 3 events (quality over quantity)
- Do NO MORE THAN 4 searches total
- Focus on stories with DRAMA, MONEY, CONTROVERSY, or HISTORIC significance
- Include actual betting lines, contract values, or career stats when relevant

Make every sentence dense with information and personality. This should read like the smartest, funniest sports analyst you know wrote it after 3 beers.`,
                tools: {
                    web_search: webSearchTool,
                },
            });

            let accumulatedText = '';
            
            for await (const chunk of textStream) {
                accumulatedText += chunk;
                
                // Try to parse partial JSON as we stream
                const partialParsed = tryParsePartialJSON(accumulatedText);
                if (partialParsed) {
                    setPartialData(partialParsed);
                }
            }
            
            // Final parsing attempt
            const finalParsed = tryParsePartialJSON(accumulatedText);
            if (finalParsed && finalParsed.summary && finalParsed.events && finalParsed.barTalk) {
                setSportsNews(finalParsed as SportsNews);
                setPartialData(null);
            } else {
                throw new Error('Failed to parse complete structured response');
            }
            
        } catch (error) {
            if (error instanceof Error && error.message.includes('Web search failed')) {
                setError('Web search error: ' + error.message);
            } else {
                setError('Error fetching sports news: ' + (error as Error).message);
            }
        } finally {
            setLoading(false);
        }
    };  

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            'NFL': '🏈',
            'College Football': '🏈',
            'NBA': '🏀',
            'MLB': '⚾',
            'NHL': '🏒',
            'Tennis': '🎾',
            'Soccer': '⚽',
            'Other': '🏆'
        };
        return icons[category] || '🏆';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-12">
                        <div className="text-center">
                            <h1 className="text-5xl font-light text-gray-900 tracking-tight mb-3">
                                ECHO<span className="font-bold">SPORTS</span>
                            </h1>
                            <p className="text-lg text-gray-500 font-light mb-8 max-w-2xl mx-auto">
                                Real-time intelligence on the cultural pulse of American sports
                            </p>
                            
                            <button 
                                onClick={handleSportsSearch} 
                                disabled={loading}
                                className={`
                                    px-8 py-3 text-sm font-medium tracking-wider uppercase transition-all duration-200
                                    ${loading 
                                        ? 'bg-gray-400 text-gray-100 cursor-not-allowed' 
                                        : 'bg-black text-white hover:bg-gray-900 active:bg-black'
                                    }
                                    transform hover:scale-105 active:scale-95
                                    shadow-lg hover:shadow-xl
                                `}
                            >
                                {loading ? 'Analyzing...' : 'Generate Report'}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-8">
                        <div className="flex items-center">
                            <div className="w-2 h-2 bg-red-500 mr-3"></div>
                            <span className="text-red-800 font-medium">System Error:</span>
                        </div>
                        <p className="text-red-700 mt-2 text-sm">{error}</p>
                    </div>
                )}

                {/* Show streaming status */}
                {loading && !partialData && (
                    <div className="bg-white border border-gray-200 shadow-sm">
                        <div className="border-l-4 border-gray-400 p-8">
                            <div className="flex items-center mb-4">
                                <div className="w-1 h-1 bg-gray-400 mr-3"></div>
                                <h2 className="text-lg font-medium text-gray-900 tracking-wider uppercase">
                                    Generating Intelligence Report
                                </h2>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-black"></div>
                                <p className="text-gray-600 font-light">
                                    Searching sports databases and analyzing cultural significance...
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Show partial data while streaming */}
                {(partialData || sportsNews) && (
                    <div className="space-y-12">
                        {/* Executive Summary */}
                        <section className="bg-white border border-gray-200 shadow-sm">
                            <div className={`border-l-4 p-8 ${loading ? 'border-gray-400' : 'border-black'}`}>
                                <div className="flex items-center mb-4">
                                    <div className={`w-1 h-1 mr-3 ${loading ? 'bg-gray-400' : 'bg-black'}`}></div>
                                    <h2 className="text-lg font-medium text-gray-900 tracking-wider uppercase">
                                        Executive Summary
                                    </h2>
                                    {loading && (
                                        <div className="ml-3 animate-spin w-3 h-3 border border-gray-300 border-t-black"></div>
                                    )}
                                </div>
                                <p className="text-gray-600 leading-relaxed text-lg font-light">
                                    {(sportsNews?.summary || partialData?.summary) || (loading ? 'Analyzing current sports landscape...' : '')}
                                </p>
                            </div>
                        </section>

                        {/* Events Grid */}
                        <section>
                            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                                {(sportsNews?.events || partialData?.events || [])
                                    .sort((a, b) => {
                                        const significanceOrder = { High: 3, Medium: 2, Low: 1 };
                                        return significanceOrder[b.significance] - significanceOrder[a.significance];
                                    })
                                    .map((event, index) => (
                                        <article
                                            key={index}
                                            className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group"
                                        >
                                            {/* Header */}
                                            <div className="border-b border-gray-100 p-6 pb-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-2xl">{getCategoryIcon(event.category)}</span>
                                                        <span className="text-xs font-medium text-gray-500 tracking-widest uppercase">
                                                            {event.category}
                                                        </span>
                                                    </div>
                                                    <div className={`
                                                        px-2 py-1 text-xs font-bold tracking-wider uppercase
                                                        ${event.significance === 'High' 
                                                            ? 'bg-black text-white' 
                                                            : event.significance === 'Medium'
                                                            ? 'bg-gray-600 text-white'
                                                            : 'bg-gray-300 text-gray-700'
                                                        }
                                                    `}>
                                                        {event.significance}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-6">
                                                <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-black transition-colors">
                                                    {event.headline}
                                                </h3>
                                                
                                                <p className="text-gray-600 leading-relaxed mb-4 font-light">
                                                    {event.description}
                                                </p>

                                                {/* Metadata */}
                                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {event.teams && event.teams.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {event.teams.map((team, teamIndex) => (
                                                                    <span 
                                                                        key={teamIndex}
                                                                        className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                                                    >
                                                                        {team}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {event.date && (
                                                            <span className="text-xs text-gray-500 font-mono ml-auto">
                                                                {event.date}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Links */}
                                                    {event.links && event.links.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {event.links.map((link, linkIndex) => (
                                                                <a
                                                                    key={linkIndex}
                                                                    href={link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors group"
                                                                >
                                                                    <span className="border-b border-blue-200 group-hover:border-blue-400">
                                                                        {new URL(link).hostname.replace('www.', '')}
                                                                    </span>
                                                                    <svg 
                                                                        className="w-3 h-3 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" 
                                                                        fill="none" 
                                                                        stroke="currentColor" 
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                    </svg>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    ))
                                }
                            </div>
                        </section>

                        {/* Bar Talk Section */}
                        {((sportsNews?.barTalk && sportsNews.barTalk.length > 0) || (partialData?.barTalk && partialData.barTalk.length > 0)) && (
                            <section className="bg-black text-white">
                                <div className="p-8">
                                    <div className="flex items-center mb-6">
                                        <div className="w-1 h-1 bg-white mr-3"></div>
                                        <h2 className="text-lg font-medium tracking-wider uppercase">
                                            Bar Talk
                                        </h2>
                                        <span className="text-xs text-gray-400 ml-3 font-light">
                                            // Conversation starters
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {(sportsNews?.barTalk || partialData?.barTalk || []).map((comment, index) => (
                                            <div 
                                                key={index}
                                                className="group cursor-pointer hover:bg-gray-900 transition-colors duration-200 p-4 border-l border-gray-800 hover:border-white"
                                            >
                                                <div className="flex items-start space-x-4">
                                                    <span className="text-gray-500 font-mono text-sm mt-1">
                                                        {String(index + 1).padStart(2, '0')}
                                                    </span>
                                                    <p className="text-white font-light leading-relaxed text-lg group-hover:text-gray-100">
                                                        "{comment}"
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="mt-6 pt-4 border-t border-gray-800">
                                        <p className="text-gray-400 text-xs font-light tracking-wide">
                                            GENERATED INSIGHTS • USE RESPONSIBLY AT LOCAL ESTABLISHMENTS
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}