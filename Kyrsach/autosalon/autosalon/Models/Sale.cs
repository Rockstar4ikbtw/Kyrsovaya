using System.ComponentModel.DataAnnotations;

namespace autosalon.Models
{
    public class Sale
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Марка автомобиля обязательна!")]
        [StringLength(100, ErrorMessage = "Марка не должна быть длиннее 100 символов!")]
        public string Brand { get; set; }

        [Required(ErrorMessage = "Дата обязательна!")]
        public DateTime Date { get; set; }

        [Range(0, 100000000, ErrorMessage = "Цена указана неверно!")]
        public int Price { get; set; }

        [Required]
        public int ClientId { get; set; }

        public User? Client { get; set; }


        [Required]
        public int CarId { get; set; }

        public Car? Car { get; set; }


        [Required]
        public int ManagerId { get; set; }

        public User? Manager { get; set; }


        public int? ApplicationId { get; set; }

        public Application? Application { get; set; }
    }
}
