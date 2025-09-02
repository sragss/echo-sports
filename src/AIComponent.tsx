import { useState } from 'react';
import { generateText } from 'ai';
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

export default function AIComponent() { 
    const [sportsNews, setSportsNews] = useState<SportsNews | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { anthropic: echoAnthropic } = useEchoModelProviders();

    const handleSportsSearch = async () => {
        setLoading(true);
        setError(null);
        setSportsNews(null);
        
        try {
            const webSearchTool = anthropic.tools.webSearch_20250305({
                maxUses: 5,
            });

            const { text } = await generateText({
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

Make sure none of the bar talk is longer than 20 words. Be aggressive like a 20-year-old would talk.

IMPORTANT: For each event, include 1-3 relevant links to reputable sources (ESPN, CBS Sports, The Athletic, etc.) that provide more details about the story. These should be actual URLs from your web search results.

Only provide TOP 4 events. No more.

Focus on the most culturally significant and newsworthy events. For barTalk, create witty, quotable comments that mix sports insight with humor - the kind of things that would make you sound smart and funny when talking sports with friends. Include references to recent drama, upsets, or cultural moments.`,
                tools: {
                    web_search: webSearchTool,
                },
            });
            
            // Parse the JSON response
            try {
                const parsedData = JSON.parse(text) as SportsNews;
                setSportsNews(parsedData);
            } catch (parseError) {
                // If JSON parsing fails, try to extract JSON from the text
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsedData = JSON.parse(jsonMatch[0]) as SportsNews;
                    setSportsNews(parsedData);
                } else {
                    throw new Error('Failed to parse structured response');
                }
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

                {sportsNews && (
                    <div className="space-y-12">
                        {/* Executive Summary */}
                        <section className="bg-white border border-gray-200 shadow-sm">
                            <div className="border-l-4 border-black p-8">
                                <div className="flex items-center mb-4">
                                    <div className="w-1 h-1 bg-black mr-3"></div>
                                    <h2 className="text-lg font-medium text-gray-900 tracking-wider uppercase">
                                        Executive Summary
                                    </h2>
                                </div>
                                <p className="text-gray-600 leading-relaxed text-lg font-light">
                                    {sportsNews.summary}
                                </p>
                            </div>
                        </section>

                        {/* Events Grid */}
                        <section>
                            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                                {sportsNews.events
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
                        {sportsNews.barTalk && sportsNews.barTalk.length > 0 && (
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
                                        {sportsNews.barTalk.map((comment, index) => (
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