import React, { useState, useEffect } from 'react';
import { Trophy, Target, Flame, Medal, Crown, Star } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  phoneNumber: string;
  totalScore?: number;
  playStreak?: number;
  winningStreak?: number;
  questionsAnswered?: number;
  accuracyRate?: number;
  joinDate: string;
}

interface LeaderboardData {
  type: string;
  title: string;
  description: string;
  leaderboard: LeaderboardEntry[];
}

interface UserPosition {
  rank: number;
  value: number;
  title: string;
}

interface UserPositions {
  totalScore: UserPosition;
  playStreak: UserPosition;
  winningStreak: UserPosition;
}

const Leaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'totalScore' | 'playStreak' | 'winningStreak'>('totalScore');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [userPositions, setUserPositions] = useState<UserPositions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    {
      id: 'totalScore' as const,
      name: 'Total Points',
      icon: Trophy,
      emoji: '🏆',
      description: 'Quiz Masters by Total Points'
    },
    {
      id: 'playStreak' as const,
      name: 'Play Streak',
      icon: Target,
      emoji: '🎯',
      description: 'Daily Consistency Champions'
    },
    {
      id: 'winningStreak' as const,
      name: 'Winning Streak',
      icon: Flame,
      emoji: '🔥',
      description: 'Consecutive Win Legends'
    }
  ];

  useEffect(() => {
    fetchLeaderboard(activeTab);
    // Also fetch user positions if we have a current user
    const currentUser = localStorage.getItem('userPhoneNumber');
    if (currentUser) {
      fetchUserPosition(currentUser);
    }
  }, [activeTab]);

  const fetchLeaderboard = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leaderboards/${type.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      const data = await response.json();
      setLeaderboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosition = async (phoneNumber: string) => {
    try {
      const response = await fetch(`/api/user/${phoneNumber}/leaderboard-position`);
      if (response.ok) {
        const data = await response.json();
        setUserPositions(data.positions);
      }
    } catch (err) {
      console.error('Failed to fetch user position:', err);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Star className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600';
      default:
        return 'bg-gradient-to-r from-blue-500 to-purple-600';
    }
  };

  const formatValue = (entry: LeaderboardEntry, type: string) => {
    switch (type) {
      case 'totalScore':
        return `${entry.totalScore?.toLocaleString()} pts`;
      case 'playStreak':
        return `${entry.playStreak} days`;
      case 'winningStreak':
        return `${entry.winningStreak} wins`;
      default:
        return '';
    }
  };

  const getSecondaryInfo = (entry: LeaderboardEntry, type: string) => {
    switch (type) {
      case 'totalScore':
        return `${entry.accuracyRate}% accuracy • ${entry.questionsAnswered} questions`;
      case 'playStreak':
        return `${entry.totalScore?.toLocaleString()} total points`;
      case 'winningStreak':
        return `${entry.accuracyRate}% accuracy • ${entry.totalScore?.toLocaleString()} points`;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🏆 Leaderboards</h1>
          <p className="text-gray-600">Compete with quiz masters around the world!</p>
        </div>

        {/* User Position Card */}
        {userPositions && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-center">Your Rankings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(userPositions).map(([key, position]) => (
                <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-1">
                    {key === 'totalScore' && '🏆'}
                    {key === 'playStreak' && '🎯'}
                    {key === 'winningStreak' && '🔥'}
                  </div>
                  <div className="text-sm text-gray-600">{position.title}</div>
                  <div className="text-xl font-bold text-indigo-600">#{position.rank}</div>
                  <div className="text-sm text-gray-500">
                    {key === 'totalScore' && `${position.value.toLocaleString()} pts`}
                    {key === 'playStreak' && `${position.value} days`}
                    {key === 'winningStreak' && `${position.value} wins`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 mx-2 mb-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                }`}
              >
                <span className="text-lg">{tab.emoji}</span>
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Leaderboard */}
        {leaderboardData && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
              <h2 className="text-2xl font-bold mb-2">{leaderboardData.title}</h2>
              <p className="text-indigo-100">{leaderboardData.description}</p>
            </div>

            <div className="divide-y divide-gray-200">
              {leaderboardData.leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`p-6 flex items-center space-x-4 hover:bg-gray-50 transition-colors ${
                    entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRankBgColor(entry.rank)} text-white`}>
                      {entry.rank <= 3 ? getRankIcon(entry.rank) : <span className="font-bold">#{entry.rank}</span>}
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{entry.phoneNumber}</h3>
                        <p className="text-sm text-gray-500">{getSecondaryInfo(entry, activeTab)}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600">
                          {formatValue(entry, activeTab)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Joined {new Date(entry.joinDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {leaderboardData.leaderboard.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-lg">No rankings yet. Be the first to play!</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p className="text-sm">
            🎉 Rankings update in real-time as you play! Keep answering questions to climb the leaderboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;