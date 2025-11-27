import "../styles/lb-player-componente-styles.css"

export interface PlayerProps {
    rank: String,
    name: String,
    fide_id: String,
    country: string,
    rating: String
}

export default function LbPlayer(props: PlayerProps) {
    return (
        <div className='player-component-div'>
            <p className='rank-position'>{props.rank}</p>
            <p className='player-country'>{props.country}</p>
            <p className='player-name'>{props.name}</p>
            <p className='player-rating'>{props.rating}</p>
             <p className='player-fideId'>{props.fide_id}</p>
        </div>
    )
}

