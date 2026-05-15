namespace autosalon.Models
{
    public enum Role
    {
        User = 1,
        Admin = 2,
        Manager = 3,
        Accountant = 4
    }

    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Login { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        
        public Role Role { get; set; } = Role.User;
        
        [System.Text.Json.Serialization.JsonIgnore]
        public ICollection<Sale> Sales { get; set; } = new List<Sale>();
    }
}